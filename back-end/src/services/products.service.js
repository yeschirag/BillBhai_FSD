const db = require('../db/pool');
const repo = require('../repositories/products');
const inventoryRepo = require('../repositories/inventory');
const { parseCsv } = require('../utils/csv');
const { HttpError, notFound } = require('../utils/http');
const { resolveCreateCompany, resolveCompanyScope, belongsToScope } = require('./scope');

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Header cells are matched case/space/underscore-insensitively. */
function normalizeHeader(cell) {
  return String(cell).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Imports are a shopkeeper pasting a supplier sheet, not a data pipeline.
const MAX_IMPORT_ROWS = 2000;

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

  async list(query = {}, actor) {
    const companyId = resolveCompanyScope(actor, query.companyId);
    return repo.findAll(db, {
      category: query.category ? String(query.category).trim() : undefined,
      companyId: companyId || undefined,
      ...parsePaging(query),
    });
  },

  async categories() {
    return repo.findCategories(db);
  },

  async getByBarcode(barcode, actor) {
    const product = await repo.findByBarcode(db, String(barcode).trim());
    if (!product) throw notFound('Product with barcode', barcode);
    if (!belongsToScope(product, actor)) throw notFound('Product with barcode', barcode);
    return product;
  },

  async getById(id, actor) {
    const product = await repo.findById(db, id);
    if (!product) throw notFound('Product', id);
    if (!belongsToScope(product, actor)) throw notFound('Product', id);
    return product;
  },

  async create(payload = {}, actor) {
    if (!payload.name || !String(payload.name).trim()) {
      throw new HttpError(400, 'Product name is required', 'Bad Request');
    }
    const price = toNumber(payload.price, 0);
    if (price < 0) throw new HttpError(400, 'Price cannot be negative', 'Bad Request');
    const companyId = resolveCreateCompany(actor, payload.companyId);
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
      companyId: companyId || null,
    });
  },

  async update(id, payload = {}, actor) {
    const existing = await repo.findById(db, id);
    if (!existing) throw notFound('Product', id);
    if (!belongsToScope(existing, actor)) throw notFound('Product', id);
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
  async remove(id, actor) {
    const existing = await repo.findById(db, id);
    if (!existing) throw notFound('Product', id);
    if (!belongsToScope(existing, actor)) throw notFound('Product', id);
    await repo.remove(db, id);
    return { statusCode: 200, message: `Product ${id} deleted` };
  },

  /**
   * Bulk CSV import (POST /api/products/import). Valid rows are inserted in
   * one transaction — optionally with a starting inventory row when a stock
   * column is present — while invalid rows are reported per line instead of
   * aborting the batch.
   */
  async importCsv(actor, payload = {}) {
    const text = typeof payload.csv === 'string' ? payload.csv : '';
    if (!text.trim()) throw new HttpError(400, 'csv text is required', 'Bad Request');
    const rows = parseCsv(text);
    if (!rows.length) throw new HttpError(400, 'CSV must include a header row', 'Bad Request');
    if (rows.length - 1 > MAX_IMPORT_ROWS) {
      throw new HttpError(400, `CSV exceeds the maximum of ${MAX_IMPORT_ROWS} data rows`, 'Bad Request');
    }

    const header = rows[0].map(normalizeHeader);
    const at = (name) => header.indexOf(name);
    const C = {
      name: at('name'),
      category: at('category'),
      barcode: at('barcode'),
      price: at('price'),
      purchasePrice: at('purchaseprice'),
      gstRate: at('gstrate'),
      size: at('size'),
      description: at('description'),
      stock: at('stock'),
      reorderLevel: at('reorderlevel'),
    };
    if (C.name === -1) throw new HttpError(400, 'CSV must include a "name" column', 'Bad Request');

    const failed = [];
    const seenBarcodes = new Set();
    const valid = [];

    for (let i = 1; i < rows.length; i += 1) {
      const line = i + 1;
      const cells = rows[i];
      const get = (idx) => (idx === -1 ? '' : String(cells[idx] ?? '').trim());
      const reject = (message) => failed.push({ line, message });

      const name = get(C.name);
      if (!name) { reject('name is required'); continue; }

      const barcode = get(C.barcode);
      if (barcode) {
        if (seenBarcodes.has(barcode.toLowerCase())) { reject(`duplicate barcode ${barcode} within the file`); continue; }
        seenBarcodes.add(barcode.toLowerCase());
      }

      const price = toNumber(get(C.price) || 0);
      if (price < 0) { reject('price cannot be negative'); continue; }
      const gstRate = Math.max(0, toNumber(get(C.gstRate) || 0));
      const purchasePrice = Math.max(0, toNumber(get(C.purchasePrice) || 0));

      let stock;
      if (C.stock !== -1 && get(C.stock) !== '') {
        stock = Number(get(C.stock));
        if (!Number.isInteger(stock) || stock < 0) { reject('stock must be a non-negative integer'); continue; }
      }
      let reorderLevel = 0;
      if (C.reorderLevel !== -1 && get(C.reorderLevel) !== '') {
        reorderLevel = Number(get(C.reorderLevel));
        if (!Number.isInteger(reorderLevel) || reorderLevel < 0) { reject('reorder level must be a non-negative integer'); continue; }
      }

      valid.push({
        name,
        category: get(C.category) || 'General',
        barcode,
        price,
        gstRate,
        purchasePrice,
        size: get(C.size),
        description: get(C.description),
        stockProvided: stock !== undefined,
        stock: stock ?? 0,
        reorderLevel,
      });
    }

    // Barcodes that already exist in the database are rejected up front so
    // the insert loop below cannot trip the unique index mid-transaction.
    const barcodes = valid.filter((r) => r.barcode).map((r) => r.barcode.toLowerCase());
    if (barcodes.length) {
      const takenRows = await db.query(
        'SELECT lower(barcode) AS bc FROM products WHERE lower(barcode) = ANY($1)',
        [barcodes],
      );
      const taken = new Set(takenRows.rows.map((row) => row.bc));
      for (let i = valid.length - 1; i >= 0; i -= 1) {
        const record = valid[i];
        if (record.barcode && taken.has(record.barcode.toLowerCase())) {
          failed.push({ line: 'db', message: `barcode ${record.barcode} already exists` });
          valid.splice(i, 1);
        }
      }
    }

    const companyId = resolveCreateCompany(actor, payload.companyId);
    const products = await db.withTransaction(async (tx) => {
      const createdProducts = [];
      for (const record of valid) {
        const product = await repo.insert(tx, record);
        if (record.stockProvided && companyId) {
          await inventoryRepo.insert(tx, {
            companyId,
            productId: product.id,
            stock: record.stock,
            reorderLevel: record.reorderLevel,
          });
        }
        createdProducts.push(product);
      }
      return createdProducts;
    });

    return { imported: products.length, failed, products };
  },
};
