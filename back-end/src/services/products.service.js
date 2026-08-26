const db = require('../db/pool');
const repo = require('../repositories/products');
const { HttpError, notFound } = require('../utils/http');

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Parse ?limit/&offset; invalid values are ignored, caps prevent abuse. */
function parsePaging(query = {}) {
  const limitRaw = Number(query.limit);
  const offsetRaw = Number(query.offset);
  return {
    limit: Number.isInteger(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 500) : undefined,
    offset: Number.isInteger(offsetRaw) && offsetRaw > 0 ? offsetRaw : undefined,
  };
}

module.exports = {
  parsePaging,

  async list(query = {}) {
    return repo.findAll(db, {
      category: query.category ? String(query.category).trim() : undefined,
      ...parsePaging(query),
    });
  },

  async categories() {
    return repo.findCategories(db);
  },

  async getByBarcode(barcode) {
    const product = await repo.findByBarcode(db, String(barcode).trim());
    if (!product) throw notFound('Product with barcode', barcode);
    return product;
  },

  async getById(id) {
    const product = await repo.findById(db, id);
    if (!product) throw notFound('Product', id);
    return product;
  },

  async create(payload = {}) {
    if (!payload.name || !String(payload.name).trim()) {
      throw new HttpError(400, 'Product name is required', 'Bad Request');
    }
    const price = toNumber(payload.price, 0);
    if (price < 0) throw new HttpError(400, 'Price cannot be negative', 'Bad Request');
    return repo.insert(db, {
      supplierId: payload.supplierId || null,
      name: String(payload.name).trim(),
      category: payload.category || 'General',
      barcode: payload.barcode ? String(payload.barcode).trim() : '',
      price,
      gstRate: Math.max(0, toNumber(payload.gstRate, 0)),
      purchasePrice: Math.max(0, toNumber(payload.purchasePrice, 0)),
      size: String(payload.size || '').trim(),
      description: String(payload.description || '').trim(),
      companyId: payload.companyId || null,
    });
  },

  async update(id, payload = {}) {
    const existing = await repo.findById(db, id);
    if (!existing) throw notFound('Product', id);
    const fields = {};
    if (payload.supplierId !== undefined) fields.supplierId = payload.supplierId || null;
    if (payload.name !== undefined) fields.name = String(payload.name).trim();
    if (payload.category !== undefined) fields.category = String(payload.category).trim();
    if (payload.barcode !== undefined) fields.barcode = String(payload.barcode).trim();
    if (payload.price !== undefined) fields.price = Math.max(0, toNumber(payload.price));
    if (payload.gstRate !== undefined) fields.gstRate = Math.max(0, toNumber(payload.gstRate));
    if (payload.purchasePrice !== undefined) fields.purchasePrice = Math.max(0, toNumber(payload.purchasePrice));
    if (payload.size !== undefined) fields.size = String(payload.size).trim();
    if (payload.description !== undefined) fields.description = String(payload.description).trim();
    return repo.update(db, id, fields);
  },

  /** Cascades to inventory rows; order history keeps its snapshots. */
  async remove(id) {
    const existing = await repo.findById(db, id);
    if (!existing) throw notFound('Product', id);
    await repo.remove(db, id);
    return { statusCode: 200, message: `Product ${id} deleted` };
  },
};
