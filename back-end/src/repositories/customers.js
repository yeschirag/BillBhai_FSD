const { mapRow } = require('./mappers');

const SELECT = 'SELECT * FROM customers';

function toCustomer(row) {
  if (!row) return null;
  return {
    id: row.id,
    companyId: row.company_id,
    phone: row.phone,
    name: row.name,
    email: row.email,
    address: row.address,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

module.exports = {
  toCustomer,

  async findAll(db, { companyId } = {}) {
    const clauses = [];
    const values = [];
    if (companyId) {
      values.push(companyId);
      clauses.push(`company_id = $${values.length}`);
    }
    const where = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
    const result = await db.query(`${SELECT}${where} ORDER BY id`, values);
    return result.rows.map(toCustomer);
  },

  async findById(db, id, { companyId } = {}) {
    const result = await db.query(
      `${SELECT} WHERE id = $1${companyId ? ' AND company_id = $2' : ''}`,
      companyId ? [id, companyId] : [id],
    );
    return toCustomer(result.rows[0]);
  },

  async findByPhone(db, phone) {
    const result = await db.query(`${SELECT} WHERE phone = $1 ORDER BY id LIMIT 1`, [phone]);
    return toCustomer(result.rows[0]);
  },

  async insert(db, customer) {
    const result = await db.query(
      `INSERT INTO customers (company_id, phone, name, email, address, notes)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [customer.companyId, customer.phone, customer.name, customer.email, customer.address, customer.notes],
    );
    return toCustomer(result.rows[0]);
  },

  async update(db, id, fields, { companyId } = {}) {
    const FIELD_MAP = {
      phone: 'phone',
      name: 'name',
      email: 'email',
      address: 'address',
      notes: 'notes',
      companyId: 'company_id',
    };
    const { setClause, values } = mapRow(fields, FIELD_MAP);
    if (!setClause) return findById(db, id, { companyId });
    const result = await db.query(
      `UPDATE customers SET ${setClause} WHERE id = $${values.length + 1}${companyId ? ' AND company_id = $' + (values.length + 2) : ''} RETURNING *`,
      companyId ? [...values, id, companyId] : [...values, id],
    );
    return toCustomer(result.rows[0]);
  },

  async remove(db, id) {
    const result = await db.query('DELETE FROM customers WHERE id = $1', [id]);
    return result.rowCount > 0;
  },

  /**
   * Profile aggregates for the customer detail view, computed in SQL:
   * lifetime order count and spend, last purchase, and outstanding amount
   * (billed orders where recorded payments — including splits — fall short
   * of the order total). Cancelled orders are excluded everywhere.
   */
  async findProfile(db, id) {
    const result = await db.query(
      `SELECT c.id, c.company_id, c.phone, c.name, c.email,
              (SELECT COUNT(*) FROM orders o
                WHERE o.customer_id = c.id AND o.status <> 'Cancelled')::int AS order_count,
              COALESCE((SELECT SUM(o.total) FROM orders o
                WHERE o.customer_id = c.id AND o.status <> 'Cancelled'), 0)::float AS total_spend,
              (SELECT MAX(o.order_date) FROM orders o
                WHERE o.customer_id = c.id AND o.status <> 'Cancelled') AS last_purchase_at,
              COALESCE((SELECT SUM(GREATEST(o.total - COALESCE(p.paid, 0), 0))
                 FROM orders o
                 JOIN bills b ON b.order_id = o.id
                 LEFT JOIN (SELECT bill_no, SUM(amount_paid) AS paid
                            FROM payments GROUP BY bill_no) p ON p.bill_no = b.bill_no
                WHERE o.customer_id = c.id AND o.status <> 'Cancelled'), 0)::float AS outstanding
         FROM customers c WHERE c.id = $1`,
      [id],
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      id: row.id,
      companyId: row.company_id,
      phone: row.phone,
      name: row.name,
      email: row.email,
      orderCount: row.order_count,
      totalSpend: row.total_spend,
      lastPurchaseAt: row.last_purchase_at,
      outstanding: Math.max(0, Number(row.outstanding.toFixed(2))),
    };
  },
};
