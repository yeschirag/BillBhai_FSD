const db = require('../db/pool');
const repo = require('../repositories/customers');
const { notFound } = require('../utils/http');
const { resolveCompanyScope, resolveCreateCompany, belongsToScope } = require('./scope');

function assertVisible(customer, actor) {
  if (!customer || !belongsToScope(customer, actor)) {
    throw notFound('Customer', customer ? customer.id : '');
  }
}

module.exports = {
  async list(actor, queryCompanyId) {
    const companyId = resolveCompanyScope(actor, queryCompanyId);
    return repo.findAll(db, { companyId });
  },

  async getById(actor, id) {
    const customer = await repo.findById(db, id);
    assertVisible(customer, actor);
    return customer;
  },

  /** Lookup is tenant-scoped: a phone shared across businesses stays private. */
  async getByPhone(actor, phone) {
    const companyId = resolveCompanyScope(actor, null);
    const customer = await repo.findByPhone(db, String(phone).trim());
    if (!customer || (companyId && customer.companyId !== companyId)) {
      throw notFound('Customer', phone);
    }
    return customer;
  },

  async create(actor, payload = {}) {
    const companyId = resolveCreateCompany(actor, payload.companyId, 'BIZ-101');
    return repo.insert(db, {
      companyId,
      phone: String(payload.phone || payload.mobileNo || '').trim(),
      name: payload.name || 'Walk-in',
      email: String(payload.email || '').trim(),
      address: String(payload.address || '').trim(),
      notes: String(payload.notes || '').trim(),
    });
  },

  async update(actor, id, payload = {}) {
    const existing = await repo.findById(db, id);
    assertVisible(existing, actor);
    const fields = {};
    for (const key of ['phone', 'name', 'email', 'address', 'notes']) {
      if (payload[key] !== undefined) fields[key] = String(payload[key]).trim();
    }
    if (payload.mobileNo !== undefined && payload.phone === undefined) {
      fields.phone = String(payload.mobileNo).trim();
    }
    return repo.update(db, id, fields);
  },

  async remove(actor, id) {
    const existing = await repo.findById(db, id);
    assertVisible(existing, actor);
    await repo.remove(db, id);
    return { statusCode: 200, message: `Customer ${id} deleted` };
  },
};
