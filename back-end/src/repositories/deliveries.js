const { mapRow } = require('./mappers');

const SELECT = 'SELECT * FROM deliveries';

function toDelivery(row) {
  if (!row) return null;
  return {
    id: row.id,
    orderId: row.order_id || '',
    oid: row.order_id || '',
    companyId: row.company_id,
    customer: row.customer,
    customerName: row.customer,
    address: row.address,
    partner: row.partner,
    partnerName: row.partner,
    partnerPhone: row.partner_phone,
    status: row.status,
    etaMin: row.eta_min === null ? null : row.eta_min,
    time: row.dispatched_at,
    dispatchDate: row.dispatched_at,
    deliveredAt: row.delivered_at,
    updatedAt: row.updated_at,
  };
}

module.exports = {
  toDelivery,

  async findAll(db, { companyId, status, limit, offset } = {}) {
    const clauses = [];
    const values = [];
    if (companyId) {
      values.push(companyId);
      clauses.push(`company_id = $${values.length}`);
    }
    if (status) {
      values.push(`%${status}%`);
      clauses.push(`lower(status) LIKE lower($${values.length})`);
    }
    const where = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
    let sql = `${SELECT}${where} ORDER BY dispatched_at DESC`;
    if (Number.isInteger(limit) && limit > 0) {
      values.push(limit);
      sql += ` LIMIT $${values.length}`;
    }
    if (Number.isInteger(offset) && offset > 0) {
      values.push(offset);
      sql += ` OFFSET $${values.length}`;
    }
    const result = await db.query(sql, values);
    return result.rows.map(toDelivery);
  },

  async findById(db, id, { companyId } = {}) {
    const result = await db.query(
      `${SELECT} WHERE id = $1${companyId ? ' AND company_id = $2' : ''}`,
      companyId ? [id, companyId] : [id],
    );
    return toDelivery(result.rows[0]);
  },

  async findByOrderId(db, orderId, { companyId } = {}) {
    const result = await db.query(
      `${SELECT} WHERE order_id = $1 ORDER BY dispatched_at DESC LIMIT 1`,
      companyId ? [orderId, companyId] : [orderId],
    );
    return toDelivery(result.rows[0]);
  },

  async insert(db, delivery) {
    const result = await db.query(
      `INSERT INTO deliveries (order_id, company_id, customer, address, partner, partner_phone,
                              status, eta_min)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        delivery.orderId || null,
        delivery.companyId,
        delivery.customer,
        delivery.address,
        delivery.partner,
        delivery.partnerPhone,
        delivery.status,
        delivery.etaMin === undefined ? null : delivery.etaMin,
      ],
    );
    return toDelivery(result.rows[0]);
  },

  async update(db, id, fields, { companyId } = {}) {
    const FIELD_MAP = {
      orderId: 'order_id',
      oid: 'order_id',
      customer: 'customer',
      address: 'address',
      partner: 'partner',
      partnerPhone: 'partner_phone',
      status: 'status',
      etaMin: 'eta_min',
      deliveredAt: 'delivered_at',
    };
    const mappedFields = { ...fields };
    // Status transitions to Delivered stamp the delivery time server-side.
    if (mappedFields.status === 'Delivered' && mappedFields.deliveredAt === undefined) {
      mappedFields.deliveredAt = new Date().toISOString();
    }
    const { setClause, values } = mapRow(mappedFields, FIELD_MAP);
    if (!setClause) return findById(db, id, { companyId });
    let sql = `UPDATE deliveries SET ${setClause} WHERE id = $${values.length + 1}`;
    const params = [...values, id];
    if (companyId) {
      params.push(companyId);
      sql += ` AND company_id = $${params.length}`;
    }
    const result = await db.query(`${sql} RETURNING *`, params);
    return toDelivery(result.rows[0]);
  },

  async remove(db, id, { companyId } = {}) {
    const result = await db.query(
      `DELETE FROM deliveries WHERE id = $1${companyId ? ' AND company_id = $2' : ''}`,
      companyId ? [id, companyId] : [id],
    );
    return result.rowCount > 0;
  },
};
