const { mapRow } = require('./mappers');

const SELECT = 'SELECT * FROM returns';

function toReturn(row) {
  if (!row) return null;
  return {
    id: row.id,
    orderId: row.order_id || '',
    oid: row.order_id || '',
    companyId: row.company_id,
    staffId: row.staff_id || '',
    reason: row.reason,
    product: row.product,
    qty: row.qty,
    returnType: row.return_type,
    amount: Number(row.amount),
    refundAmount: Number(row.amount),
    status: row.status,
    requestedBy: row.requested_by,
    returnDate: row.return_date,
    updatedAt: row.updated_at,
  };
}

module.exports = {
  toReturn,

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
    let sql = `${SELECT}${where} ORDER BY return_date DESC`;
    if (Number.isInteger(limit) && limit > 0) {
      values.push(limit);
      sql += ` LIMIT $${values.length}`;
    }
    if (Number.isInteger(offset) && offset > 0) {
      values.push(offset);
      sql += ` OFFSET $${values.length}`;
    }
    const result = await db.query(sql, values);
    return result.rows.map(toReturn);
  },

  async findById(db, id, { companyId } = {}) {
    const result = await db.query(
      `${SELECT} WHERE id = $1${companyId ? ' AND company_id = $2' : ''}`,
      companyId ? [id, companyId] : [id],
    );
    return toReturn(result.rows[0]);
  },

  async insert(db, entry) {
    const result = await db.query(
      `INSERT INTO returns (order_id, company_id, staff_id, reason, product, qty, return_type,
                           amount, status, requested_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        entry.orderId || null,
        entry.companyId,
        entry.staffId || null,
        entry.reason,
        entry.product || '',
        entry.qty,
        entry.returnType,
        entry.amount,
        entry.status,
        entry.requestedBy,
      ],
    );
    return toReturn(result.rows[0]);
  },

  async update(db, id, fields, { companyId } = {}) {
    const FIELD_MAP = {
      orderId: 'order_id',
      oid: 'order_id',
      reason: 'reason',
      product: 'product',
      qty: 'qty',
      returnType: 'return_type',
      amount: 'amount',
      refundAmount: 'amount',
      status: 'status',
      requestedBy: 'requested_by',
    };
    const { setClause, values } = mapRow(fields, FIELD_MAP);
    if (!setClause) return findById(db, id, { companyId });
    let sql = `UPDATE returns SET ${setClause} WHERE id = $${values.length + 1}`;
    const params = [...values, id];
    if (companyId) {
      params.push(companyId);
      sql += ` AND company_id = $${params.length}`;
    }
    const result = await db.query(`${sql} RETURNING *`, params);
    return toReturn(result.rows[0]);
  },

  async remove(db, id, { companyId } = {}) {
    const result = await db.query(
      `DELETE FROM returns WHERE id = $1${companyId ? ' AND company_id = $2' : ''}`,
      companyId ? [id, companyId] : [id],
    );
    return result.rowCount > 0;
  },
};
