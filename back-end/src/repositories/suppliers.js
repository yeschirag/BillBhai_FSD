const { mapRow } = require('./mappers');

const SELECT = 'SELECT * FROM suppliers';

function toSupplier(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    mobileNo: row.mobile_no,
    phone: row.mobile_no,
    email: row.email,
    address: row.address,
    gstNo: row.gst_no,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

module.exports = {
  toSupplier,

  async findAll(db) {
    const result = await db.query(`${SELECT} ORDER BY id`);
    return result.rows.map(toSupplier);
  },

  async findById(db, id) {
    const result = await db.query(`${SELECT} WHERE id = $1`, [id]);
    return toSupplier(result.rows[0]);
  },

  async insert(db, supplier) {
    const result = await db.query(
      `INSERT INTO suppliers (name, mobile_no, email, address, gst_no)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [supplier.name, supplier.mobileNo, supplier.email, supplier.address, supplier.gstNo],
    );
    return toSupplier(result.rows[0]);
  },

  async update(db, id, fields) {
    const FIELD_MAP = {
      name: 'name',
      mobileNo: 'mobile_no',
      phone: 'mobile_no',
      email: 'email',
      address: 'address',
      gstNo: 'gst_no',
    };
    const { setClause, values } = mapRow(fields, FIELD_MAP);
    if (!setClause) return findById(db, id);
    const result = await db.query(
      `UPDATE suppliers SET ${setClause} WHERE id = $${values.length + 1} RETURNING *`,
      [...values, id],
    );
    return toSupplier(result.rows[0]);
  },

  async remove(db, id) {
    const result = await db.query('DELETE FROM suppliers WHERE id = $1', [id]);
    return result.rowCount > 0;
  },
};
