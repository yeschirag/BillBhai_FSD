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
};
