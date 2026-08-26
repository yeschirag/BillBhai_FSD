const db = require('../db/pool');
const repo = require('../repositories/returns');
const { HttpError, notFound } = require('../utils/http');
const { resolveCompanyScope, resolveCreateCompany, belongsToScope } = require('./scope');

function assertVisible(entry, actor) {
  if (!entry || !belongsToScope(entry, actor)) {
    throw notFound('Return', entry ? entry.id : '');
  }
}

module.exports = {
  async list(actor, query = {}) {
    const companyId = resolveCompanyScope(actor, query.companyId);
    return repo.findAll(db, {
      companyId,
      status: query.status ? String(query.status).trim() : undefined,
    });
  },

  async getById(actor, id) {
    const entry = await repo.findById(db, id);
    assertVisible(entry, actor);
    return entry;
  },

  async create(actor, payload = {}) {
    const companyId = resolveCreateCompany(actor, payload.companyId, 'BIZ-101');
    if (!companyId) throw new HttpError(400, 'companyId is required', 'Bad Request');
    const amountRaw = payload.amount ?? payload.refundAmount;
    const qtyRaw = Number(payload.qty ?? 1);
    return repo.insert(db, {
      orderId: payload.oid || payload.orderId || '',
      companyId,
      staffId: actor?.userId || null,
      reason: payload.reason || payload.product || 'Return requested',
      product: String(payload.product || '').trim(),
      qty: Number.isInteger(qtyRaw) && qtyRaw > 0 ? qtyRaw : 1,
      returnType: payload.returnType || 'refund',
      amount: Math.max(0, Number(amountRaw ?? 0) || 0),
      status: payload.status || 'Pending',
      requestedBy: payload.requestedBy
        || (actor && (actor.name || actor.username))
        || 'Counter staff',
    });
  },

  async update(actor, id, payload = {}) {
    const existing = await repo.findById(db, id);
    assertVisible(existing, actor);
    const fields = {};
    if (payload.reason !== undefined) fields.reason = String(payload.reason).trim();
    if (payload.product !== undefined) fields.product = String(payload.product).trim();
    if (payload.status !== undefined) fields.status = String(payload.status).trim();
    if (payload.requestedBy !== undefined) fields.requestedBy = String(payload.requestedBy).trim();
    if (payload.returnType !== undefined) fields.returnType = String(payload.returnType).trim();
    if (payload.qty !== undefined) {
      const qty = Number(payload.qty);
      fields.qty = Number.isInteger(qty) && qty > 0 ? qty : existing.qty;
    }
    const amountRaw = payload.amount ?? payload.refundAmount;
    if (amountRaw !== undefined) {
      fields.amount = Math.max(0, Number(amountRaw) || 0);
    }
    return repo.update(db, id, fields);
  },

  async remove(actor, id) {
    const existing = await repo.findById(db, id);
    assertVisible(existing, actor);
    await repo.remove(db, id);
    return { statusCode: 200, message: `Return ${id} deleted` };
  },
};
