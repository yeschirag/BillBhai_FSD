const { mapRow } = require('./mappers');

function toCompany(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    owner: row.owner,
    adminName: row.admin_name,
    type: row.type,
    email: row.email,
    phone: row.phone,
    gstNo: row.gst_no,
    address: row.address,
    status: row.status,
    productsPlan: row.products_plan,
    tenureMonths: row.tenure_months,
    storesCount: row.stores_count,
    profit: Number(row.profit),
    paymentDue: Number(row.payment_due),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT = 'SELECT * FROM companies';

const FIELD_MAP = {
  name: 'name',
  owner: 'owner',
  adminName: 'admin_name',
  type: 'type',
  email: 'email',
  phone: 'phone',
  gstNo: 'gst_no',
  address: 'address',
  status: 'status',
  productsPlan: 'products_plan',
  tenureMonths: 'tenure_months',
  storesCount: 'stores_count',
  profit: 'profit',
  paymentDue: 'payment_due',
};

async function findById(db, id) {
  const result = await db.query(`${SELECT} WHERE id = $1`, [id]);
  return toCompany(result.rows[0]);
}

module.exports = {
  toCompany,

  async findAll(db) {
    const result = await db.query(`${SELECT} ORDER BY id`);
    return result.rows.map(toCompany);
  },

  findById,

  async insert(db, company) {
    const result = await db.query(
      `INSERT INTO companies (name, owner, admin_name, type, email, phone, gst_no, address,
                             status, products_plan, tenure_months, stores_count, profit, payment_due)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        company.name,
        company.owner,
        company.adminName,
        company.type,
        company.email,
        company.phone,
        company.gstNo,
        company.address,
        company.status,
        company.productsPlan,
        company.tenureMonths,
        company.storesCount,
        company.profit,
        company.paymentDue,
      ],
    );
    return toCompany(result.rows[0]);
  },

  async update(db, id, fields) {
    const { setClause, values } = mapRow(fields, FIELD_MAP);
    if (!setClause) return findById(db, id);
    const result = await db.query(
      `UPDATE companies SET ${setClause} WHERE id = $${values.length + 1} RETURNING *`,
      [...values, id],
    );
    return toCompany(result.rows[0]);
  },

  async remove(db, id) {
    const result = await db.query('DELETE FROM companies WHERE id = $1', [id]);
    return result.rowCount > 0;
  },
};
