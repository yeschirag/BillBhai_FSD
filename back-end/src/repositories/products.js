const { mapRow } = require('./mappers');

const SELECT = 'SELECT * FROM products';

function toProduct(row) {
  if (!row) return null;
  return {
    id: row.id,
    supplierId: row.supplier_id || '',
    name: row.name,
    category: row.category,
    barcode: row.barcode || '',
    price: Number(row.price),
    gstRate: Number(row.gst_rate ?? 0),
    purchasePrice: Number(row.purchase_price ?? 0),
    size: row.size,
    description: row.description,
    companyId: row.company_id || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

module.exports = {
  toProduct,

  async findAll(db, { category, limit, offset } = {}) {
    const clauses = [];
    const values = [];
    if (category) {
      values.push(category);
      clauses.push(`category = $${values.length}`);
    }
    const where = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
    const paging = applyPaging(values, limit, offset);
    const result = await db.query(`${SELECT}${where} ORDER BY id${paging.sql}`, paging.values);
    return result.rows.map(toProduct);
  },

  async findById(db, id) {
    const result = await db.query(`${SELECT} WHERE id = $1`, [id]);
    return toProduct(result.rows[0]);
  },

  async findByBarcode(db, barcode) {
    const result = await db.query(
      `${SELECT} WHERE lower(barcode) = lower($1) ORDER BY id LIMIT 1`,
      [barcode],
    );
    return toProduct(result.rows[0]);
  },

  async findCategories(db) {
    const result = await db.query(
      'SELECT DISTINCT category FROM products ORDER BY category',
    );
    return result.rows.map((row) => row.category);
  },

  async insert(db, product) {
    const result = await db.query(
      `INSERT INTO products (supplier_id, name, category, barcode, price, gst_rate, purchase_price, size, description, company_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        product.supplierId || null,
        product.name,
        product.category,
        product.barcode || null,
        product.price,
        product.gstRate ?? 0,
        product.purchasePrice ?? 0,
        product.size,
        product.description,
        product.companyId || null,
      ],
    );
    return toProduct(result.rows[0]);
  },

  async update(db, id, fields) {
    const FIELD_MAP = {
      supplierId: 'supplier_id',
      name: 'name',
      category: 'category',
      barcode: 'barcode',
      price: 'price',
      gstRate: 'gst_rate',
      purchasePrice: 'purchase_price',
      size: 'size',
      description: 'description',
      companyId: 'company_id',
    };
    const { setClause, values } = mapRow(fields, FIELD_MAP);
    if (!setClause) return findById(db, id);
    const result = await db.query(
      `UPDATE products SET ${setClause} WHERE id = $${values.length + 1} RETURNING *`,
      [...values, id],
    );
    return toProduct(result.rows[0]);
  },

  async remove(db, id) {
    const result = await db.query('DELETE FROM products WHERE id = $1', [id]);
    return result.rowCount > 0;
  },
};

function applyPaging(values, limit, offset) {
  let sql = '';
  if (Number.isInteger(limit) && limit > 0) {
    values.push(limit);
    sql += ` LIMIT $${values.length}`;
  }
  if (Number.isInteger(offset) && offset > 0) {
    values.push(offset);
    sql += ` OFFSET $${values.length}`;
  }
  return { sql, values };
}
