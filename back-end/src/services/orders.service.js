const db = require('../db/pool');
const repo = require('../repositories/orders');
const holdsRepo = require('../repositories/holds');
const { HttpError, notFound, conflict } = require('../utils/http');
const { resolveCompanyScope, resolveCreateCompany, belongsToScope } = require('./scope');

// Same promotion as the legacy NestJS service — kept for contract parity.
const PROMO_CODE = 'WELCOME10';
const PROMO_RATE = 0.1;
const MAX_CART_BYTES = 100_000;
const MAX_HOLD_LABEL = 200;

function rejectHoldLabel(label) {
  if (label.length > MAX_HOLD_LABEL) {
    throw new HttpError(400, `Label must be at most ${MAX_HOLD_LABEL} characters`, 'Bad Request');
  }
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

function round2(value) {
  return Number(Number(value).toFixed(2));
}

const PROMO_RULES = {
  WELCOME10: { type: 'percent', rate: 0.1, minSubtotal: 0, label: '10% Welcome Discount' },
  SAVE10: { type: 'percent', rate: 0.1, minSubtotal: 0, label: '10% Off' },
  SAVE20: { type: 'percent', rate: 0.2, minSubtotal: 250, label: '20% Off on ₹250+' },
  FESTIVE15: { type: 'percent', rate: 0.15, minSubtotal: 200, label: '15% Festive Offer' },
  FLAT50: { type: 'flat', amount: 50, minSubtotal: 200, label: '₹50 Flat Off' },
  FLAT100: { type: 'flat', amount: 100, minSubtotal: 500, label: '₹100 Flat Off' },
  BILLBHAI: { type: 'percent', rate: 0.15, minSubtotal: 0, label: '15% Special Discount' },
};

function calculatePromoDiscount(code, subtotal) {
  const normalized = String(code || '').trim().toUpperCase();
  const rule = PROMO_RULES[normalized];
  if (!rule) {
    throw new HttpError(400, `Invalid promo code "${code}". Try WELCOME10, SAVE10, SAVE20, FLAT50 or BILLBHAI`, 'Bad Request');
  }
  if (subtotal < rule.minSubtotal) {
    throw new HttpError(400, `Promo ${normalized} requires a minimum order of ₹${rule.minSubtotal}`, 'Bad Request');
  }
  let discount = 0;
  if (rule.type === 'percent') {
    discount = Number((subtotal * rule.rate).toFixed(2));
  } else if (rule.type === 'flat') {
    discount = Math.min(rule.amount, subtotal);
  }
  return { code: normalized, discount, label: rule.label };
}

/** Totals are computed server-side; client-supplied totals are ignored. */
function computeTotals(items, discountAmountRaw, promoCodeRaw) {
  const subtotal = items.reduce(
    (sum, item) => sum + item.itemPrice * item.quantity,
    0,
  );
  const promoCode = String(promoCodeRaw || '').trim().toUpperCase();
  let discount = 0;
  if (promoCode) {
    const promoResult = calculatePromoDiscount(promoCode, subtotal);
    discount = promoResult.discount;
  } else {
    discount = Math.max(0, Number(discountAmountRaw ?? 0) || 0);
  }
  const total = Math.max(0, Number((subtotal - discount).toFixed(2)));
  return { subtotal, discount, total, promoCode: promoCode || null };
}

function normalizeItems(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new HttpError(400, 'Order must include at least one item', 'Bad Request');
  }
  return rawItems.map((item, index) => {
    const productId = String(item?.productId || '').trim();
    if (!productId) {
      throw new HttpError(400, `Item ${index + 1}: productId is required`, 'Bad Request');
    }
    const quantity = toNumber(item?.quantity);
    if (Number.isNaN(quantity) || !Number.isInteger(quantity) || quantity <= 0) {
      throw new HttpError(400, `Item ${index + 1}: quantity must be a positive integer`, 'Bad Request');
    }
    const itemPrice = toNumber(item?.itemPrice);
    if (Number.isNaN(itemPrice) || itemPrice < 0) {
      throw new HttpError(400, `Item ${index + 1}: itemPrice must be a non-negative number`, 'Bad Request');
    }
    return { productId, quantity, itemPrice };
  });
}

async function attachItems(orders) {
  if (!orders.length) return orders;
  const items = await repo.findItemsByOrderIds(db, orders.map((order) => order.id));
  const byOrder = new Map();
  for (const item of items) {
    if (!byOrder.has(item.orderId)) byOrder.set(item.orderId, []);
    byOrder.get(item.orderId).push(item);
  }
  // Legacy snapshots exposed `items` plus a derived itemsCount fallback.
  return orders.map((order) => ({
    ...order,
    items: byOrder.get(order.id) || [],
  }));
}

module.exports = {
  validatePromotion(code, subtotalRaw) {
    const subtotal = Math.max(0, Number(subtotalRaw) || 0);
    const promoResult = calculatePromoDiscount(code, subtotal);
    return {
      valid: true,
      code: promoResult.code,
      discount: promoResult.discount,
      label: promoResult.label,
      subtotal,
      total: Math.max(0, Number((subtotal - promoResult.discount).toFixed(2))),
    };
  },

  async list(actor, query = {}) {
    const companyId = resolveCompanyScope(actor, query.companyId);
    const orders = await repo.findOrders(db, {
      companyId,
      status: query.status ? String(query.status).trim() : undefined,
      customerId: query.customerId ? String(query.customerId).trim() : undefined,
    });
    return attachItems(orders);
  },

  async getById(actor, id) {
    const order = await repo.findOrderById(db, id);
    if (!order || !belongsToScope(order, actor)) {
      throw notFound('Order', id);
    }
    const [withItems] = await attachItems([order]);
    return withItems;
  },

  /**
   * POS checkout. Order + line items + stock decrement commit atomically:
   * any failure rolls the whole order back, so stock and order history can
   * never disagree.
   */
  async create(actor, payload = {}) {
    const rawItems = normalizeItems(payload.items);
    const companyId = resolveCreateCompany(actor, payload.companyId, '');
    if (!companyId) throw new HttpError(400, 'companyId is required', 'Bad Request');

    const productMap = await repo.findProductNamesByIds(
      db,
      rawItems.map((item) => item.productId),
    );

    const items = rawItems.map((item) => {
      const dbProd = productMap.get(item.productId);
      const itemPrice = item.itemPrice > 0 ? item.itemPrice : (dbProd?.price || 0);
      return {
        ...item,
        itemPrice,
        productName: dbProd?.name || item.productName || '',
      };
    });

    const { discount, total, promoCode } = computeTotals(
      items,
      payload.discountAmount,
      payload.promoCode,
    );

    try {
      return await db.withTransaction(async (tx) => {
        // Order first so stock ledger movements can reference it. A shortage
        // below still aborts the whole transaction (order included).
        const order = await repo.insertOrder(tx, {
          companyId,
          customerId: payload.customerId,
          customerName: payload.customerName
            ?? (payload.customer && typeof payload.customer === 'object' ? payload.customer.name : undefined),
          customerAddress: payload.customerAddress,
          staffId: payload.staffId || actor?.userId,
          orderType: payload.orderType || 'pickup',
          checkoutMode: payload.checkoutMode || '',
          status: 'Processing',
          discountAmount: discount,
          promoCode,
          paymentMethod: payload.paymentMethod ?? 'Pending',
          total,
          itemsCount: items.reduce((sum, item) => sum + item.quantity, 0),
          notes: payload.notes || '',
        });
        const shortages = await repo.decrementStockForItems(tx, companyId, items, {
          referenceId: order.id,
        });
        if (shortages.length) {
          const first = shortages[0];
          throw conflict(
            `Insufficient stock for product ${first.productId} (requested ${first.requested}, available ${first.available})`,
          );
        }
        const insertedItems = [];
        for (const item of items) {
          insertedItems.push(await repo.insertOrderItem(tx, order.id, {
            ...item,
            productName: item.productName || '',
          }));
        }
        return { ...order, items: insertedItems };
      });
    } catch (err) {
      if (err && err.code === '23503') {
        // order_items.product_id FK → unknown product reference.
        throw new HttpError(400, 'One of the ordered products does not exist', 'Bad Request');
      }
      throw err;
    }
  },

  async update(actor, id, payload = {}) {
    const existing = await repo.findOrderById(db, id);
    if (!existing || !belongsToScope(existing, actor)) {
      throw notFound('Order', id);
    }
    const fields = {};
    if (payload.status !== undefined) fields.status = String(payload.status).trim();
    if (payload.customerName !== undefined) fields.customerName = String(payload.customerName).trim();
    if (payload.customerAddress !== undefined) fields.customerAddress = String(payload.customerAddress).trim();
    if (payload.paymentMethod !== undefined) fields.paymentMethod = String(payload.paymentMethod).trim();
    if (payload.orderType !== undefined) fields.orderType = String(payload.orderType).trim();
    if (payload.checkoutMode !== undefined) fields.checkoutMode = String(payload.checkoutMode).trim();
    if (payload.notes !== undefined) fields.notes = String(payload.notes).trim();
    if (payload.promoCode !== undefined) fields.promoCode = String(payload.promoCode).trim().toUpperCase() || null;
    if (payload.discountAmount !== undefined) {
      fields.discountAmount = Math.max(0, Number(payload.discountAmount) || 0);
    }
    if (payload.itemsCount !== undefined) {
      fields.itemsCount = Math.max(0, Math.trunc(Number(payload.itemsCount) || 0));
    }
    if (payload.total !== undefined) {
      fields.total = Math.max(0, Number(payload.total) || 0);
    }
    const updated = await repo.updateOrder(db, id, fields);
    if (!updated) throw notFound('Order', id);
    const [withItems] = await attachItems([updated]);
    return withItems;
  },

  /**
   * Orders that have been billed are financially significant and cannot be
   * deleted (FK NO ACTION on bills.order_id surfaces as 23503).
   */
  async remove(actor, id) {
    const existing = await repo.findOrderById(db, id);
    if (!existing || !belongsToScope(existing, actor)) {
      throw notFound('Order', id);
    }
    try {
      const removed = await repo.removeOrder(db, id);
      if (!removed) throw notFound('Order', id);
      return { message: `Order ${id} deleted`, order: removed };
    } catch (err) {
      if (err && err.code === '23503') {
        throw conflict(`Order ${id} has been billed and cannot be deleted`);
      }
      throw err;
    }
  },

  // ── Bills ──

  async listBills(actor, query = {}) {
    const companyId = resolveCompanyScope(actor, query.companyId);
    return repo.findBills(db, { companyId });
  },

  async getBillByNo(actor, billNo) {
    const bill = await repo.findBillByNo(db, String(billNo).trim());
    if (!bill || !belongsToScope(bill, actor)) {
      throw notFound('Bill', billNo);
    }
    return bill;
  },

  async createBill(actor, payload = {}) {
    if (!payload.orderId) {
      throw new HttpError(400, 'orderId is required', 'Bad Request');
    }
    const order = await repo.findOrderById(db, String(payload.orderId).trim());
    if (!order || !belongsToScope(order, actor)) {
      throw notFound('Order', payload.orderId);
    }
    return repo.insertBill(db, {
      orderId: order.id,
      companyId: order.companyId,
      taxAmount: Math.max(0, Number(payload.taxAmount ?? 0) || 0),
      discountAmount: Math.max(0, Number(payload.discountAmount ?? 0) || 0),
    });
  },

  // ── Payments ──

  async listPayments(actor, query = {}) {
    const companyId = resolveCompanyScope(actor, query.companyId);
    return repo.findPayments(db, { companyId });
  },

  async getPaymentByBillNo(actor, billNo) {
    const payment = await repo.findPaymentByBillNo(db, String(billNo).trim());
    if (!payment || !belongsToScope(payment, actor)) {
      throw notFound('Payment for bill', billNo);
    }
    return payment;
  },

  /**
   * Split-payment view: every row recorded against the bill plus the
   * running totals. The amount due is the order total; overpayments are
   * allowed (change given) but never make the balance negative.
   */
  async getBillPaymentSummary(actor, billNo) {
    const trimmed = String(billNo).trim();
    const bill = await repo.findBillByNo(db, trimmed);
    if (!bill || !belongsToScope(bill, actor)) {
      throw notFound('Bill', billNo);
    }
    const order = await repo.findOrderById(db, bill.orderId);
    if (!order || !belongsToScope(order, actor)) {
      throw notFound('Order', bill.orderId);
    }
    const payments = await repo.findPaymentsByBillNo(db, bill.billNo);
    const paidSoFar = round2(payments.reduce((sum, p) => sum + Number(p.amountPaid), 0));
    const total = Number(order.total);
    return {
      billNo: bill.billNo,
      orderId: order.id,
      companyId: bill.companyId,
      amountDue: total,
      paidSoFar,
      balanceDue: Math.max(0, round2(total - paidSoFar)),
      settled: paidSoFar >= total,
      payments,
    };
  },

  async createPayment(actor, payload = {}) {
    if (!payload.billNo) {
      throw new HttpError(400, 'billNo is required', 'Bad Request');
    }
    const amountPaid = toNumber(payload.amountPaid);
    if (Number.isNaN(amountPaid) || amountPaid <= 0) {
      throw new HttpError(400, 'amountPaid must be a positive number', 'Bad Request');
    }

    // Serialize concurrent tenders on the same order: both terminals lock
    // the order row before reading prior payments, so splits can never
    // double-count and silently overpay.
    return db.withTransaction(async (tx) => {
      const bill = await repo.findBillByNo(tx, String(payload.billNo).trim());
      if (!bill || !belongsToScope(bill, actor)) {
        throw notFound('Bill', payload.billNo);
      }
      await repo.lockOrderById(tx, bill.orderId);
      const order = await repo.findOrderById(tx, bill.orderId);
      if (!order || !belongsToScope(order, actor)) {
        throw notFound('Order', bill.orderId);
      }
      if (order.status === 'Cancelled') {
        throw conflict(`Order ${order.id} is cancelled — take a return instead of a payment`);
      }

      // Splits: accumulate against prior rows for this bill.
      const prior = await repo.findPaymentsByBillNo(tx, bill.billNo);
      const paidSoFar = prior.reduce((sum, p) => sum + Number(p.amountPaid), 0);
      const total = Number(order.total);
      const remainingBefore = Math.max(0, round2(total - paidSoFar));
      const paymentStatus = round2(amountPaid) >= remainingBefore ? 'Paid' : 'Partial';

      const payment = await repo.insertPayment(tx, {
        billNo: bill.billNo,
        companyId: bill.companyId,
        paymentMethod: String(payload.paymentMethod || 'Cash').trim(),
        paymentStatus,
        amountPaid,
      });

      return {
        ...payment,
        amountDue: total,
        paidSoFar: round2(paidSoFar + amountPaid),
        balanceDue: Math.max(0, round2(total - paidSoFar - amountPaid)),
      };
    });
  },

  // ── Held bills ──
  // A hold is a parked cart. The client owns the cart's shape; the server
  // validates only the envelope and keeps holds tenant-scoped.

  async createHold(actor, payload = {}) {
    if (!payload.cart || typeof payload.cart !== 'object') {
      throw new HttpError(400, 'cart must be a JSON object or array', 'Bad Request');
    }
    if (JSON.stringify(payload.cart).length > MAX_CART_BYTES) {
      throw new HttpError(400, 'Cart is too large to hold', 'Bad Request');
    }
    const companyId = resolveCreateCompany(actor, payload.companyId);
    if (!companyId) throw new HttpError(400, 'companyId is required', 'Bad Request');
    const label = String(payload.label || '').trim();
    rejectHoldLabel(label);
    return holdsRepo.insert(db, {
      companyId,
      staffId: actor?.userId,
      label,
      cart: payload.cart,
      total: Math.max(0, Number(payload.total ?? 0) || 0),
    });
  },

  async listHolds(actor, query = {}) {
    const companyId = resolveCompanyScope(actor, query.companyId);
    return holdsRepo.findAll(db, { companyId });
  },

  async getHold(actor, id) {
    const hold = await holdsRepo.findById(db, String(id).trim());
    if (!hold || !belongsToScope(hold, actor)) {
      throw notFound('Held bill', id);
    }
    return hold;
  },

  async updateHold(actor, id, payload = {}) {
    const existing = await holdsRepo.findById(db, String(id).trim());
    if (!existing || !belongsToScope(existing, actor)) {
      throw notFound('Held bill', id);
    }
    const fields = {};
    if (payload.label !== undefined) {
      fields.label = String(payload.label).trim();
      rejectHoldLabel(fields.label);
    }
    if (payload.total !== undefined) fields.total = Math.max(0, Number(payload.total ?? 0) || 0);
    if (payload.cart !== undefined) {
      if (!payload.cart || typeof payload.cart !== 'object') {
        throw new HttpError(400, 'cart must be a JSON object or array', 'Bad Request');
      }
      if (JSON.stringify(payload.cart).length > MAX_CART_BYTES) {
        throw new HttpError(400, 'Cart is too large to hold', 'Bad Request');
      }
      fields.cart = payload.cart;
    }
    const updated = await holdsRepo.update(db, existing.id, fields);
    if (!updated) throw notFound('Held bill', id);
    return updated;
  },

  async discardHold(actor, id) {
    const existing = await holdsRepo.findById(db, String(id).trim());
    if (!existing || !belongsToScope(existing, actor)) {
      throw notFound('Held bill', id);
    }
    await holdsRepo.remove(db, existing.id);
    return { message: `Held bill ${existing.id} discarded` };
  },
};
