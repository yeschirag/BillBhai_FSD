const db = require('../db/pool');
const repo = require('../repositories/orders');
const { HttpError, notFound, conflict } = require('../utils/http');
const { resolveCompanyScope, resolveCreateCompany, belongsToScope } = require('./scope');

// Same promotion as the legacy NestJS service — kept for contract parity.
const PROMO_CODE = 'WELCOME10';
const PROMO_RATE = 0.1;

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
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

/** Totals are computed server-side; client-supplied totals are ignored. */
function computeTotals(items, discountAmountRaw, promoCodeRaw) {
  const subtotal = items.reduce(
    (sum, item) => sum + item.itemPrice * item.quantity,
    0,
  );
  const promoCode = String(promoCodeRaw || '').trim().toUpperCase();
  let discount;
  if (promoCode) {
    if (promoCode !== PROMO_CODE) {
      throw new HttpError(400, 'Invalid promo code', 'Bad Request');
    }
    discount = Number((subtotal * PROMO_RATE).toFixed(2));
  } else {
    discount = Math.max(0, Number(discountAmountRaw ?? 0) || 0);
  }
  const total = Math.max(0, subtotal - discount);
  return { subtotal, discount, total, promoCode: promoCode || null };
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
    if (String(code || '').trim().toUpperCase() !== PROMO_CODE) {
      throw new HttpError(400, 'Invalid promo code', 'Bad Request');
    }
    const discount = Number((subtotal * PROMO_RATE).toFixed(2));
    return {
      valid: true,
      code: PROMO_CODE,
      discount,
      subtotal,
      total: Math.max(0, Number((subtotal - discount).toFixed(2))),
    };
  },

  async list(actor, query = {}) {
    const companyId = resolveCompanyScope(actor, query.companyId);
    const orders = await repo.findOrders(db, {
      companyId,
      status: query.status ? String(query.status).trim() : undefined,
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
    const items = normalizeItems(payload.items);
    const companyId = resolveCreateCompany(actor, payload.companyId, '');
    if (!companyId) throw new HttpError(400, 'companyId is required', 'Bad Request');

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
        const nameMap = await repo.findProductNamesByIds(
          tx,
          items.map((item) => item.productId),
        );
        for (const item of items) {
          insertedItems.push(await repo.insertOrderItem(tx, order.id, {
            ...item,
            productName: nameMap.get(item.productId) || '',
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

  async createPayment(actor, payload = {}) {
    if (!payload.billNo) {
      throw new HttpError(400, 'billNo is required', 'Bad Request');
    }
    const amountPaid = toNumber(payload.amountPaid);
    if (Number.isNaN(amountPaid) || amountPaid < 0) {
      throw new HttpError(400, 'amountPaid must be a non-negative number', 'Bad Request');
    }
    const bill = await repo.findBillByNo(db, String(payload.billNo).trim());
    if (!bill || !belongsToScope(bill, actor)) {
      throw notFound('Bill', payload.billNo);
    }
    return repo.insertPayment(db, {
      billNo: bill.billNo,
      companyId: bill.companyId,
      paymentMethod: String(payload.paymentMethod || 'Cash').trim(),
      paymentStatus: 'Paid',
      amountPaid,
    });
  },
};
