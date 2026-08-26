const { mapRow } = require('./mappers');

// password_hash is deliberately never selected into API responses.
const COLUMNS = 'id, company_id, name, role, email, mobile_no, username, status, created_at, updated_at';
const SELECT = `SELECT ${COLUMNS} FROM users`;

function toUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    role: row.role,
    email: row.email,
    mobileNo: row.mobile_no,
    phone: row.mobile_no,
    username: row.username,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Internal use only (login): includes the password hash.
 * Accepts a username OR an email address (the README's "email aliases").
 * An exact username match always wins over an email match. */
async function findCredentialsByUsername(db, username) {
  const result = await db.query(
    `SELECT id, company_id, name, role, email, mobile_no, username, password_hash, status
       FROM users
      WHERE lower(username) = lower($1) OR lower(email) = lower($1)
      ORDER BY (lower(username) = lower($1)) DESC, id
      LIMIT 1`,
    [username],
  );
  return result.rows[0] || null;
}

module.exports = {
  toUser,

  async findAll(db, { companyId } = {}) {
    const clauses = [];
    const values = [];
    if (companyId) {
      values.push(companyId);
      clauses.push(`company_id = $${values.length}`);
    }
    const where = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
    const result = await db.query(`${SELECT}${where} ORDER BY id`, values);
    return result.rows.map(toUser);
  },

  async findById(db, id) {
    const result = await db.query(`${SELECT} WHERE id = $1`, [id]);
    return toUser(result.rows[0]);
  },

  findCredentialsByUsername,

  async usernameExists(db, username) {
    const result = await db.query(
      'SELECT 1 FROM users WHERE lower(username) = lower($1) LIMIT 1',
      [username],
    );
    return result.rowCount > 0;
  },

  async insert(db, user) {
    const result = await db.query(
      `INSERT INTO users (company_id, name, role, email, mobile_no, username, password_hash, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING ${COLUMNS}`,
      [
        user.companyId,
        user.name,
        user.role,
        user.email,
        user.mobileNo,
        user.username,
        user.passwordHash,
        user.status,
      ],
    );
    return toUser(result.rows[0]);
  },

  async update(db, id, fields) {
    const FIELD_MAP = {
      name: 'name',
      role: 'role',
      email: 'email',
      mobileNo: 'mobile_no',
      phone: 'mobile_no',
      passwordHash: 'password_hash',
      status: 'status',
    };
    const { setClause, values } = mapRow(fields, FIELD_MAP);
    if (!setClause) return findById(db, id);
    const result = await db.query(
      `UPDATE users SET ${setClause} WHERE id = $${values.length + 1} RETURNING *`,
      [...values, id],
    );
    return toUser(result.rows[0]);
  },

  async remove(db, id) {
    const result = await db.query('DELETE FROM users WHERE id = $1', [id]);
    return result.rowCount > 0;
  },
};
