const { mapRow } = require('./mappers');
const movements = require('./stockMovements');

function toOrder(row) {
  if (!row) return null;
  return {
    id: row.id,
    customerId: row.customer_id || '',
    customerName: row.customer_name || '',
    customerAddress: row.customer_address || '',
    staffId: row.staff_id || '',
    companyId: row.company_id,
    orderDate: row.order_date,
    orderType: row.order_type,
    checkoutMode: row.checkout_mode,
    status: row.status,
    discountAmount: Number(row.discount_amount),
    promoCode: row.promo_code || null,
    paymentMethod: row.payment_method,
    total: Number(row.total),
    itemsCount: row.items_count,
    notes: row.notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toOrderItem(row) {
  if (!row) return null;
  return {
    id: row.id,
    orderId: row.order_id,
    productId: row.product_id || '',
    productName: row.product_name || '',
    quantity: row.quantity,
    itemPrice: Number(row.item_price),
  };
}

function toBill(row) {
  if (!row) return null;
  return {
    billNo: row.bill_no,
    orderId: row.order_id,
    companyId: row.company_id,
    billDate: row.bill_date,
    taxAmount: Number(row.tax_amount),
    discountAmount: Number(row.discount_amount),
  };
}

function toPayment(row) {
  if (!row) return null;
  return {
    id: row.id,
    billNo: row.bill_no,
    companyId: row.company_id,
    paymentDate: row.payment_date,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    amountPaid: Number(row.amount_paid),
  };
}

const ORDER_SELECT = 'SELECT * FROM orders';
const ITEM_SELECT = 'SELECT * FROM order_items';

module.exports = {
  toOrder,
  toOrderItem,
  toBill,
  toPayment,

  async findOrders(db, { companyId, status, customerId, limit, offset } = {}) {
    const clauses = [];
    const values = [];
    if (companyId) {
      values.push(companyId);
      clauses.push(`company_id = $${values.length}`);
    }
    if (status) {
      values.push(status);
      clauses.push(`lower(status) LIKE lower($${values.length})`);
    }
    if (customerId) {
      values.push(customerId);
      clauses.push(`customer_id = $${values.length}`);
    }
    const where = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
    let sql = `${ORDER_SELECT}${where} ORDER BY order_date DESC`;
    const pagingValues = [...values];
    const activeLimit = (Number.isInteger(limit) && limit > 0) ? limit : 1000;
    pagingValues.push(activeLimit);
    sql += ` LIMIT $${pagingValues.length}`;
    
    if (Number.isInteger(offset) && offset > 0) {
      pagingValues.push(offset);
      sql += ` OFFSET $${pagingValues.length}`;
    }
    const result = await db.query(sql, pagingValues);
    return result.rows.map(toOrder);
  },

  async countOrders(db, { companyId } = {}) {
    const result = await db.query(
      `SELECT COUNT(*)::int AS n FROM orders${companyId ? ' WHERE company_id = $1' : ''}`,
      companyId ? [companyId] : [],
    );
    return result.rows[0].n;
  },

  async findOrderById(db, id, { companyId } = {}) {
    const result = await db.query(
      `${ORDER_SELECT} WHERE id = $1${companyId ? ' AND company_id = $2' : ''}`,
      companyId ? [id, companyId] : [id],
    );
    return toOrder(result.rows[0]);
  },

  async insertOrder(db, order) {
    const result = await db.query(
      `INSERT INTO orders (company_id, customer_id, customer_name, customer_address, staff_id,
                          order_type, checkout_mode, status, discount_amount, promo_code,
                          payment_method, total, items_count, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        order.companyId,
        order.customerId || null,
        order.customerName || '',
        order.customerAddress || '',
        order.staffId || null,
        order.orderType,
        order.checkoutMode || '',
        order.status,
        order.discountAmount,
        order.promoCode || null,
        order.paymentMethod,
        order.total,
        order.itemsCount,
        order.notes || '',
      ],
    );
    return toOrder(result.rows[0]);
  },

  async updateOrder(db, id, fields, { companyId } = {}) {
    const FIELD_MAP = {
      customerId: 'customer_id',
      customerName: 'customer_name',
      customerAddress: 'customer_address',
      staffId: 'staff_id',
      orderType: 'order_type',
      checkoutMode: 'checkout_mode',
      status: 'status',
      discountAmount: 'discount_amount',
      promoCode: 'promo_code',
      paymentMethod: 'payment_method',
      total: 'total',
      itemsCount: 'items_count',
      notes: 'notes',
    };
    const { setClause, values } = mapRow(fields, FIELD_MAP);
    if (!setClause) return findOrderById(db, id, { companyId });
    const scopeSql = companyId
      ? ` AND company_id = $${values.length + 2}`
      : '';
    const params = companyId ? [...values, id, companyId] : [...values, id];
    const result = await db.query(
      `UPDATE orders SET ${setClause} WHERE id = $${values.length + 1}${scopeSql} RETURNING *`,
      params,
    );
    return toOrder(result.rows[0]);
  },

  /** Returns the deleted order, or null. Fails via FK when bills exist. */
  async removeOrder(db, id, { companyId } = {}) {
    const result = await db.query(
      `DELETE FROM orders WHERE id = $1${companyId ? ' AND company_id = $2' : ''} RETURNING *`,
      companyId ? [id, companyId] : [id],
    );
    return result.rowCount > 0 ? toOrder(result.rows[0]) : null;
  },

  async insertOrderItem(db, orderId, item) {
    const result = await db.query(
      `INSERT INTO order_items (order_id, product_id, product_name, quantity, item_price)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [orderId, item.productId || null, item.productName || '', item.quantity, item.itemPrice],
    );
    return toOrderItem(result.rows[0]);
  },

  /** Resolves product names and prices for snapshots at checkout time — scoped to company. */
  async findProductNamesByIds(db, productIds, companyId) {
    if (!productIds.length) return new Map();
    const clauses = [`id = ANY($1::text[])`];
    const values = [productIds];
    if (companyId) {
      clauses.push(`company_id = $2`);
      values.push(companyId);
    }
    const result = await db.query(
      `SELECT id, name, price FROM products WHERE ${clauses.join(' AND ')}`,
      values,
    );
    return new Map(result.rows.map((row) => [row.id, { name: row.name, price: Number(row.price || 0) }]));
  },

  async findItemsByOrderIds(db, orderIds) {
    if (!orderIds.length) return [];
    const result = await db.query(
      `SELECT * FROM order_items WHERE order_id = ANY($1::text[]) ORDER BY id`,
      [orderIds],
    );
    return result.rows.map(toOrderItem);
  },

  /**
   * Locks inventory rows for the given products within the tenant and
   * decrements stock, writing a 'sale' movement per product to the ledger.
   * Must run inside the caller's transaction; `referenceId` is the order id.
   * Returns array of { productId, requested, available } for rows where
   * stock was insufficient (empty array = all good).
   */
  async decrementStockForItems(db, companyId, items, { referenceId = '' } = {}) {
    const shortages = [];
    for (const item of items) {
      // FOR UPDATE serializes concurrent checkouts on the same shelf row.
      const locked = await db.query(
        `SELECT id, stock FROM inventory
         WHERE company_id = $1 AND product_id = $2
         FOR UPDATE`,
        [companyId, item.productId],
      );
      if (!locked.rowCount) continue; // untracked product: nothing to decrement
      const available = locked.rows[0].stock;
      if (available < item.quantity) {
        shortages.push({ productId: item.productId, requested: item.quantity, available });
        continue;
      }
      const updated = await db.query(
        `UPDATE inventory SET stock = stock - $1, last_updated = now()
         WHERE id = $2 RETURNING stock`,
        [item.quantity, locked.rows[0].id],
      );
      await movements.insert(db, {
        companyId,
        productId: item.productId,
        delta: -item.quantity,
        balanceAfter: updated.rows[0].stock,
        reason: 'sale',
        referenceId,
      });
    }
    return shortages;
  },

  // ── Bills ──

  async findBills(db, { companyId, limit, offset } = {}) {
    const clauses = [];
    const values = [];
    if (companyId) {
      values.push(companyId);
      clauses.push(`company_id = $${values.length}`);
    }
    const where = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
    let sql = `SELECT * FROM bills${where} ORDER BY bill_date DESC`;
    if (Number.isInteger(limit) && limit > 0) {
      values.push(limit);
      sql += ` LIMIT $${values.length}`;
    }
    if (Number.isInteger(offset) && offset > 0) {
      values.push(offset);
      sql += ` OFFSET $${values.length}`;
    }
    const result = await db.query(sql, values);
    return result.rows.map(toBill);
  },

  async findBillByNo(db, billNo, { companyId } = {}) {
    const result = await db.query(
      `SELECT * FROM bills WHERE bill_no = $1${companyId ? ' AND company_id = $2' : ''}`,
      companyId ? [billNo, companyId] : [billNo],
    );
    return toBill(result.rows[0]);
  },

  async insertBill(db, bill) {
    const result = await db.query(
      `INSERT INTO bills (order_id, company_id, tax_amount, discount_amount)
       VALUES ($1,$2,$3,$4)
       RETURNING *`,
      [bill.orderId, bill.companyId, bill.taxAmount, bill.discountAmount],
    );
    return toBill(result.rows[0]);
  },

  // ── Payments ──

  async findPayments(db, { companyId, limit, offset } = {}) {
    const clauses = [];
    const values = [];
    if (companyId) {
      values.push(companyId);
      clauses.push(`company_id = $${values.length}`);
    }
    const where = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
    let sql = `SELECT * FROM payments${where} ORDER BY payment_date DESC`;
    if (Number.isInteger(limit) && limit > 0) {
      values.push(limit);
      sql += ` LIMIT $${values.length}`;
    }
    if (Number.isInteger(offset) && offset > 0) {
      values.push(offset);
      sql += ` OFFSET $${values.length}`;
    }
    const result = await db.query(sql, values);
    return result.rows.map(toPayment);
  },

  async findPaymentByBillNo(db, billNo, { companyId } = {}) {
    // Bills may carry several payment rows (splits); the legacy single-payment
    // getter keeps returning the most recent one.
    const result = await db.query(
      `SELECT * FROM payments
        WHERE bill_no = $1${companyId ? ' AND company_id = $2' : ''}
        ORDER BY payment_date DESC, created_at DESC
        LIMIT 1`,
      companyId ? [billNo, companyId] : [billNo],
    );
    return toPayment(result.rows[0]);
  },

  /** Every payment row for a bill, oldest first (split payments). */
  async findPaymentsByBillNo(db, billNo) {
    const result = await db.query(
      `SELECT * FROM payments WHERE bill_no = $1 ORDER BY payment_date ASC, created_at ASC`,
      [billNo],
    );
    return result.rows.map(toPayment);
  },

  /** Serializes money movement against one order inside a transaction. */
  async lockOrderById(db, orderId) {
    await db.query('SELECT id FROM orders WHERE id = $1 FOR UPDATE', [orderId]);
  },

  async insertPayment(db, payment) {
    const result = await db.query(
      `INSERT INTO payments (bill_no, company_id, payment_method, payment_status, amount_paid)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [
        payment.billNo,
        payment.companyId,
        payment.paymentMethod,
        payment.paymentStatus,
        payment.amountPaid,
      ],
    );
    return toPayment(result.rows[0]);
  },
};
