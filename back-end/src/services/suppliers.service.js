const db = require('../db/pool');
const repo = require('../repositories/suppliers');
const { HttpError, notFound } = require('../utils/http');

module.exports = {
  async list() {
    return repo.findAll(db);
  },

  async getById(id) {
    const supplier = await repo.findById(db, id);
    if (!supplier) throw notFound('Supplier', id);
    return supplier;
  },

  async create(payload = {}) {
    if (!payload.name || !String(payload.name).trim()) {
      throw new HttpError(400, 'Supplier name is required', 'Bad Request');
    }
    return repo.insert(db, {
      name: String(payload.name).trim(),
      mobileNo: String(payload.phone || payload.mobileNo || '').trim(),
      email: String(payload.email || '').trim(),
      address: String(payload.address || '').trim(),
      gstNo: String(payload.gstNo || '').trim(),
    });
  },

  async update(id, payload = {}) {
    const existing = await repo.findById(db, id);
    if (!existing) throw notFound('Supplier', id);
    const fields = {};
    if (payload.name !== undefined) fields.name = String(payload.name).trim();
    if (payload.phone !== undefined) fields.mobileNo = String(payload.phone).trim();
    else if (payload.mobileNo !== undefined) fields.mobileNo = String(payload.mobileNo).trim();
    if (payload.email !== undefined) fields.email = String(payload.email).trim();
    if (payload.address !== undefined) fields.address = String(payload.address).trim();
    if (payload.gstNo !== undefined) fields.gstNo = String(payload.gstNo).trim();
    return repo.update(db, id, fields);
  },

  /** Products keep existing via ON DELETE SET NULL on supplier_id. */
  async remove(id) {
    const existing = await repo.findById(db, id);
    if (!existing) throw notFound('Supplier', id);
    await repo.remove(db, id);
    return { statusCode: 200, message: `Supplier ${id} deleted` };
  },
};
