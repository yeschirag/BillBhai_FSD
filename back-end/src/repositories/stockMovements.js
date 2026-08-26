// Append-only stock ledger. Rows are written inside the same transaction as
// the stock change itself, so inventory and its history can never disagree.

function toMovement(row) {
  return {
    id: Number(row.id),
    companyId: row.company_id,
    productId: row.product_id,
    delta: row.delta,
    balanceAfter: row.balance_after,
    reason: row.reason,
    referenceId: row.reference_id,
    createdAt: row.created_at,
  };
}

module.exports = {
  toMovement,

  async insert(db, movement) {
    const result = await db.query(
      `INSERT INTO stock_movements (company_id, product_id, delta, balance_after, reason, reference_id)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [
        movement.companyId,
        movement.productId,
        movement.delta,
        movement.balanceAfter,
        movement.reason,
        movement.referenceId || '',
      ],
    );
    return toMovement(result.rows[0]);
  },

  async findRecent(db, { companyId, productId, limit = 50 } = {}) {
    const clauses = [];
    const values = [];
    if (companyId) {
      values.push(companyId);
      clauses.push(`company_id = $${values.length}`);
    }
    if (productId) {
      values.push(productId);
      clauses.push(`product_id = $${values.length}`);
    }
    const where = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
    values.push(Math.min(Math.max(1, Math.trunc(limit) || 50), 200));
    const result = await db.query(
      `SELECT * FROM stock_movements${where}
       ORDER BY created_at DESC, id DESC
       LIMIT $${values.length}`,
      values,
    );
    return result.rows.map(toMovement);
  },
};
