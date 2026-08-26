const db = require('../db/pool');
const repo = require('../repositories/deliveries');
const { HttpError, notFound } = require('../utils/http');
const { resolveCompanyScope, resolveCreateCompany, belongsToScope } = require('./scope');

function assertVisible(delivery, actor) {
  if (!delivery || !belongsToScope(delivery, actor)) {
    throw notFound('Delivery', delivery ? delivery.id : '');
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
    const delivery = await repo.findById(db, id);
    assertVisible(delivery, actor);
    return delivery;
  },

  async getByOrderId(actor, orderId) {
    const delivery = await repo.findByOrderId(db, String(orderId).trim());
    assertVisible(delivery, actor);
    return delivery;
  },

  async create(actor, payload = {}) {
    const companyId = resolveCreateCompany(actor, payload.companyId, 'BIZ-101');
    if (!companyId) throw new HttpError(400, 'companyId is required', 'Bad Request');
    const etaRaw = Number(payload.etaMin);
    return repo.insert(db, {
      orderId: payload.oid || payload.orderId || '',
      companyId,
      customer: payload.customer || 'Walk-in',
      address: String(payload.address || '').trim(),
      partner: payload.partner || 'Unassigned',
      partnerPhone: String(payload.partnerPhone || '').trim(),
      status: payload.status || 'Pending',
      etaMin: Number.isFinite(etaRaw) && String(payload.etaMin ?? '') !== '' ? etaRaw : null,
    });
  },

  async update(actor, id, payload = {}) {
    const existing = await repo.findById(db, id);
    assertVisible(existing, actor);
    const fields = {};
    for (const key of ['customer', 'address', 'partner', 'partnerPhone', 'status']) {
      if (payload[key] !== undefined) fields[key] = String(payload[key]).trim();
    }
    if (payload.partnerName !== undefined && payload.partner === undefined) {
      fields.partner = String(payload.partnerName).trim();
    }
    if (payload.oid !== undefined) fields.orderId = String(payload.oid).trim();
    else if (payload.orderId !== undefined) fields.orderId = String(payload.orderId).trim();
    if (payload.etaMin !== undefined) {
      const eta = Number(payload.etaMin);
      fields.etaMin = Number.isFinite(eta) ? Math.max(0, Math.trunc(eta)) : null;
    }
    return repo.update(db, id, fields);
  },

  async remove(actor, id) {
    const existing = await repo.findById(db, id);
    assertVisible(existing, actor);
    await repo.remove(db, id);
    return { statusCode: 200, message: `Delivery ${id} deleted` };
  },
};
