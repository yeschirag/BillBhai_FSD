const db = require('../db/pool');
const repo = require('../repositories/companies');
const { HttpError, notFound } = require('../utils/http');

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Whitelist + normalize an incoming company payload (create or update). */
function normalizeFields(payload = {}) {
  const fields = {};
  if (payload.name !== undefined) fields.name = String(payload.name).trim();
  if (payload.owner !== undefined) fields.owner = String(payload.owner).trim();
  if (payload.adminName !== undefined) fields.adminName = String(payload.adminName).trim();
  if (payload.type !== undefined) fields.type = String(payload.type).trim();
  if (payload.email !== undefined) fields.email = String(payload.email).trim();
  if (payload.phone !== undefined) fields.phone = String(payload.phone).trim();
  if (payload.mobileNo !== undefined && payload.phone === undefined) {
    fields.phone = String(payload.mobileNo).trim();
  }
  if (payload.gstNo !== undefined) fields.gstNo = String(payload.gstNo).trim();
  if (payload.address !== undefined) fields.address = String(payload.address).trim();
  if (payload.status !== undefined) fields.status = String(payload.status).trim();
  if (payload.productsPlan !== undefined) fields.productsPlan = String(payload.productsPlan).trim();
  if (payload.tenureMonths !== undefined) fields.tenureMonths = Math.max(0, Math.trunc(toNumber(payload.tenureMonths)));
  if (payload.storesCount !== undefined) fields.storesCount = Math.max(0, Math.trunc(toNumber(payload.storesCount)));
  if (payload.profit !== undefined) fields.profit = Math.max(0, toNumber(payload.profit));
  if (payload.paymentDue !== undefined) fields.paymentDue = Math.max(0, toNumber(payload.paymentDue));
  return fields;
}

module.exports = {
  async list() {
    return repo.findAll(db);
  },

  async getById(id) {
    const company = await repo.findById(db, id);
    if (!company) throw notFound('Company', id);
    return company;
  },

  async create(payload = {}) {
    const fields = normalizeFields(payload);
    if (!fields.name) fields.name = 'Untitled Business';
    return repo.insert(db, {
      name: fields.name,
      owner: fields.owner || 'Unknown Owner',
      adminName: fields.adminName || fields.owner || 'Unassigned',
      type: fields.type || 'Retail',
      email: fields.email || '',
      phone: fields.phone || '',
      gstNo: fields.gstNo || '',
      address: fields.address || '',
      status: fields.status || 'Trial',
      productsPlan: fields.productsPlan || 'Core POS',
      tenureMonths: fields.tenureMonths ?? 0,
      storesCount: fields.storesCount ?? 0,
      profit: fields.profit ?? 0,
      paymentDue: fields.paymentDue ?? 0,
    });
  },

  async update(id, payload = {}) {
    const existing = await repo.findById(db, id);
    if (!existing) throw notFound('Company', id);
    const fields = normalizeFields(payload);
    const updated = await repo.update(db, id, fields);
    return updated;
  },

  async remove(id) {
    try {
      const deleted = await repo.remove(db, id);
      if (!deleted) throw notFound('Company', id);
      return { statusCode: 200, message: `Company ${id} deleted` };
    } catch (err) {
      // users/orders/customers reference companies without CASCADE.
      if (err && err.code === '23503') {
        throw new HttpError(409, `Company ${id} still has linked records (users, customers or orders) and cannot be deleted`, 'Conflict');
      }
      throw err;
    }
  },
};
