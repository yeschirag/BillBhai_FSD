// Held bills: parked POS carts. The cart payload is stored as JSONB
// verbatim — the client owns its schema; the server owns the envelope.

function toHold(row) {
  if (!row) return null;
  return {
    id: row.id,
    companyId: row.company_id,
    staffId: row.staff_id || '',
    label: row.label,
    cart: row.cart,
    total: Number(row.total),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

module.exports = {
  toHold,

  async insert(db, hold) {
    const result = await db.query(
      `INSERT INTO held_bills (company_id, staff_id, label, cart, total)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [hold.companyId, hold.staffId || null, hold.label, JSON.stringify(hold.cart), hold.total],
    );
    return toHold(result.rows[0]);
  },

  async findAll(db, { companyId } = {}) {
    const where = companyId ? ' WHERE company_id = $1' : '';
    const result = await db.query(
      `SELECT * FROM held_bills${where} ORDER BY created_at DESC`,
      companyId ? [companyId] : [],
    );
    return result.rows.map(toHold);
  },

  async findById(db, id) {
    const result = await db.query('SELECT * FROM held_bills WHERE id = $1', [id]);
    return toHold(result.rows[0]);
  },

  async update(db, id, fields) {
    const clauses = [];
    const values = [];
    if (fields.label !== undefined) {
      values.push(fields.label);
      clauses.push(`label = $${values.length}`);
    }
    if (fields.cart !== undefined) {
      values.push(JSON.stringify(fields.cart));
      clauses.push(`cart = $${values.length}`);
    }
    if (fields.total !== undefined) {
      values.push(fields.total);
      clauses.push(`total = $${values.length}`);
    }
    if (!clauses.length) {
      const existing = await db.query('SELECT * FROM held_bills WHERE id = $1', [id]);
      return toHold(existing.rows[0]);
    }
    values.push(id);
    const result = await db.query(
      `UPDATE held_bills SET ${clauses.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values,
    );
    if (!result.rowCount) return null;
    return toHold(result.rows[0]);
  },

  async remove(db, id) {
    const result = await db.query('DELETE FROM held_bills WHERE id = $1', [id]);
    return result.rowCount > 0;
  },
};
