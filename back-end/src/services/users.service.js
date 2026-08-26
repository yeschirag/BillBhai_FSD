const bcrypt = require('bcryptjs');
const db = require('../db/pool');
const repo = require('../repositories/users');
const { HttpError, notFound, conflict } = require('../utils/http');
const { normalizeRole, resolveCreateCompany, belongsToScope } = require('./scope');

const ALLOWED_ROLES = ['superuser', 'admin', 'cashier', 'customer', 'inventorymanager', 'deliveryops', 'returnhandler'];

/** Roles arrive as "Inventory Manager" from some UIs; store them canonical. */
function canonicalRole(value) {
  const role = normalizeRole(value);
  if (!ALLOWED_ROLES.includes(role)) {
    throw new HttpError(400, `Invalid role: ${value}. Allowed roles: ${ALLOWED_ROLES.join(', ')}`, 'Bad Request');
  }
  return role;
}

function assertVisible(userRecord, actor) {
  if (!userRecord) throw new HttpError(404, 'User not found', 'Not Found');
  if (!belongsToScope(userRecord, actor)) {
    // Do not leak other tenants' staff accounts.
    throw new HttpError(404, 'User not found', 'Not Found');
  }
}

module.exports = {
  async list(actor, queryCompanyId) {
    const companyId = actor && normalizeRole(actor.role) === 'superuser'
      ? String(queryCompanyId || '').trim()
      : String(actor?.companyId || '').trim();
    return repo.findAll(db, { companyId });
  },

  async getById(actor, id) {
    const user = await repo.findById(db, id);
    assertVisible(user, actor);
    return user;
  },

  async create(actor, payload = {}) {
    if (!payload.username || !payload.name) {
      throw new HttpError(400, 'Username and name are required', 'Bad Request');
    }
    if (await repo.usernameExists(db, payload.username)) {
      throw conflict(`Username ${payload.username} is already taken`);
    }
    const role = payload.role !== undefined
      ? canonicalRole(payload.role)
      : 'cashier';
    let password = payload.password;
    if (password !== undefined && password !== null && String(password).length < 6) {
      throw new HttpError(400, 'Password must be at least 6 characters', 'Bad Request');
    }
    if (password === undefined || password === null || password === '') {
      password = 'welcome123';
    }
    const companyId = resolveCreateCompany(actor, payload.companyId, 'BIZ-101');
    if (!companyId) throw new HttpError(400, 'companyId is required', 'Bad Request');
    try {
      return await repo.insert(db, {
        companyId,
        name: String(payload.name).trim(),
        role,
        email: String(payload.email || '').trim(),
        mobileNo: String(payload.phone || payload.mobileNo || '').trim(),
        username: String(payload.username).trim().toLowerCase().replace(/\s+/g, ''),
        passwordHash: bcrypt.hashSync(String(password), 10),
        status: payload.status || 'Active',
      });
    } catch (err) {
      if (err && err.code === '23505') {
        throw conflict(`Username ${payload.username} is already taken`);
      }
      throw err;
    }
  },

  /**
   * `id` and `username` are immutable; a new password is hashed before it
   * ever reaches the database.
   */
  async update(actor, id, payload = {}) {
    const existing = await repo.findById(db, id);
    assertVisible(existing, actor);

    const fields = {};
    if (payload.name !== undefined) fields.name = String(payload.name).trim();
    if (payload.email !== undefined) fields.email = String(payload.email).trim();
    if (payload.phone !== undefined) fields.mobileNo = String(payload.phone).trim();
    else if (payload.mobileNo !== undefined) fields.mobileNo = String(payload.mobileNo).trim();
    if (payload.status !== undefined) fields.status = String(payload.status).trim();
    if (payload.password !== undefined && payload.password !== '') {
      fields.passwordHash = bcrypt.hashSync(String(payload.password), 10);
    }
    if (payload.role !== undefined) [fields.role] = [canonicalRole(payload.role)];

    const updated = await repo.update(db, id, fields);
    return updated;
  },

  async remove(actor, id) {
    const existing = await repo.findById(db, id);
    if (!existing) throw notFound('User', id);
    if (!belongsToScope(existing, actor)) throw notFound('User', id);
    if (existing.role === 'superuser') {
      throw new HttpError(403, 'Superuser accounts cannot be deleted', 'Forbidden');
    }
    await repo.remove(db, id);
    return { statusCode: 200, message: `User ${id} deleted` };
  },
};
