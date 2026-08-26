const { mapRow } = require('./mappers');

// Join products so the API payload keeps the denormalized name/category/price
// the frontend already renders, without storing duplicated columns.
const SELECT = `
  SELECT inv.id, inv.product_id, inv.company_id, inv.stock, inv.reorder_level,
         inv.location, inv.last_updated, inv.created_at, inv.updated_at,
         p.name AS product_name, p.category AS product_category,
         p.price AS product_price, p.supplier_id AS product_supplier_id
  FROM inventory inv
  JOIN products p ON p.id = inv.product_id`;

function computeStatus(stock, reorderLevel) {
  if (stock <= 0) return 'Out of Stock';
  if (stock <= reorderLevel * 0.5) return 'Critical';
  if (stock <= reorderLevel) return 'Low Stock';
  return 'In Stock';
}

function toInventoryItem(row) {
  if (!row) return null;
  const stock = row.stock;
  const reorderLevel = row.reorder_level;
  return {
    id: row.id,
    productId: row.product_id,
    companyId: row.company_id,
    name: row.product_name,
    cat: row.product_category,
    category: row.product_category,
    supplier: row.product_supplier_id || '',
    supplierId: row.product_supplier_id || '',
    stock,
    stockAvailable: stock,
    price: Number(row.product_price),
    status: computeStatus(stock, reorderLevel),
    reorderLevel,
    location: row.location,
    lastUpdated: row.last_updated,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

module.exports = {
  toInventoryItem,
  computeStatus,

  async findAll(db, { companyId } = {}) {
    const where = companyId ? ' WHERE inv.company_id = $1' : '';
    const values = companyId ? [companyId] : [];
    const result = await db.query(`${SELECT}${where} ORDER BY inv.id`, values);
    return result.rows.map(toInventoryItem);
  },

  async findLowStock(db, { companyId } = {}) {
    const clauses = ['inv.stock <= inv.reorder_level'];
    const values = [];
    if (companyId) {
      values.push(companyId);
      clauses.push(`inv.company_id = $${values.length}`);
    }
    const result = await db.query(
      `${SELECT} WHERE ${clauses.join(' AND ')} ORDER BY inv.id`,
      values,
    );
    return result.rows.map(toInventoryItem);
  },

  async findById(db, id) {
    const result = await db.query(`${SELECT} WHERE inv.id = $1`, [id]);
    return toInventoryItem(result.rows[0]);
  },

  async findByProduct(db, productId, { companyId } = {}) {
    const result = await db.query(
      `${SELECT} WHERE inv.product_id = $1${companyId ? ' AND inv.company_id = $2' : ''}`,
      companyId ? [productId, companyId] : [productId],
    );
    return toInventoryItem(result.rows[0]);
  },

  /** New shelf row (CSV import with a stock column; future bulk tools). */
  async insert(db, item) {
    const inserted = await db.query(
      `INSERT INTO inventory (company_id, product_id, stock, reorder_level, location)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id`,
      [item.companyId, item.productId, item.stock ?? 0, item.reorderLevel ?? 0, item.location || ''],
    );
    const result = await db.query(`${SELECT} WHERE inv.id = $1`, [inserted.rows[0].id]);
    return toInventoryItem(result.rows[0]);
  },

  /**
   * Race-safe adjustment. MUST run inside the caller's transaction: the row
   * is locked with FOR UPDATE first, so two concurrent adjustments can never
   * interleave their way into negative stock.
   * Returns { outcome: 'ok', id, companyId, productId, deltaApplied,
   * balanceAfter } — everything the stock-movements ledger needs — or
   * { outcome: 'not-found' | 'below-zero' }.
   */
  async adjustStock(db, { id, productId, companyId, absoluteStock, delta }) {
    const baseConditions = [];
    const baseValues = [];
    if (id) {
      baseValues.push(id);
      baseConditions.push(`inventory.id = $${baseValues.length}`);
    }
    if (productId) {
      baseValues.push(productId);
      baseConditions.push(`inventory.product_id = $${baseValues.length}`);
    }
    if (companyId) {
      baseValues.push(companyId);
      baseConditions.push(`inventory.company_id = $${baseValues.length}`);
    }
    if (!baseConditions.length) return { outcome: 'not-found' };

    const whereBase = `WHERE ${baseConditions.join(' AND ')}`;
    const locked = await db.query(
      `SELECT id, company_id, product_id, stock FROM inventory ${whereBase} FOR UPDATE`,
      baseValues,
    );
    if (!locked.rowCount) return { outcome: 'not-found' };

    const row = locked.rows[0];
    const target = absoluteStock !== undefined
      ? Math.trunc(absoluteStock)
      : row.stock + Math.trunc(delta);
    if (target < 0) return { outcome: 'below-zero' };

    const updated = await db.query(
      `UPDATE inventory SET stock = $1, last_updated = now()
       WHERE id = $2 RETURNING stock`,
      [target, row.id],
    );
    return {
      outcome: 'ok',
      id: row.id,
      companyId: row.company_id,
      productId: row.product_id,
      deltaApplied: target - row.stock,
      balanceAfter: updated.rows[0].stock,
    };
  },

  async update(db, id, fields) {
    const FIELD_MAP = {
      productId: 'product_id',
      companyId: 'company_id',
      stock: 'stock',
      reorderLevel: 'reorder_level',
      location: 'location',
    };
    const { setClause, values } = mapRow(fields, FIELD_MAP);
    if (!setClause) return findById(db, id);
    const result = await db.query(
      `UPDATE inventory SET ${setClause}, last_updated = now() WHERE id = $${values.length + 1} RETURNING id`,
      [...values, id],
    );
    if (result.rowCount === 0) return null;
    return findById(db, id);
  },
};
