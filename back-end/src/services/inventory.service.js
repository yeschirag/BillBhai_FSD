const db = require('../db/pool');
const repo = require('../repositories/inventory');
const movementsRepo = require('../repositories/stockMovements');
const { HttpError, notFound } = require('../utils/http');
const { resolveCompanyScope, belongsToScope } = require('./scope');

function toInt(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : NaN;
}

function assertVisible(item, actor) {
  if (!item || !belongsToScope(item, actor)) {
    throw notFound('Inventory item', item ? item.id : '');
  }
}

module.exports = {
  async list(actor, queryCompanyId) {
    const companyId = resolveCompanyScope(actor, queryCompanyId);
    return repo.findAll(db, { companyId });
  },

  async lowStock(actor, queryCompanyId) {
    const companyId = resolveCompanyScope(actor, queryCompanyId);
    return repo.findLowStock(db, { companyId });
  },

  async getById(actor, id) {
    const item = await repo.findById(db, id);
    assertVisible(item, actor);
    return item;
  },

  async getByProduct(actor, productId) {
    const item = await repo.findByProduct(db, String(productId).trim());
    if (!item) throw notFound('Inventory item for product', productId);
    // Untracked products are global; only enforce scope when tracked.
    if (actor && String(actor.role || '').toLowerCase() !== 'superuser'
      && item.companyId !== String(actor.companyId || '')) {
      throw notFound('Inventory item for product', productId);
    }
    return item;
  },

  /**
   * POST /inventory/adjust — accepts either an absolute `stock` or a signed
   * `delta`. The stock change and its ledger entry commit together, so the
   * movement history can never drift from the current balance.
   */
  async adjust(actor, payload = {}) {
    let target;
    if (payload.id || payload.productId) {
      target = payload.id
        ? await repo.findById(db, payload.id)
        : await repo.findByProduct(db, payload.productId);
    }
    if (!target) {
      throw notFound('Inventory item', payload.id || payload.productId);
    }
    assertVisible(target, actor);

    const reason = ['adjustment', 'correction'].includes(payload.reason)
      ? payload.reason
      : 'adjustment';

    const result = await db.withTransaction(async (tx) => {
      let outcome;
      if (payload.stock !== undefined) {
        const absolute = toInt(payload.stock);
        if (Number.isNaN(absolute) || absolute < 0) {
          throw new HttpError(400, 'Stock must be a non-negative integer', 'Bad Request');
        }
        outcome = await repo.adjustStock(tx, { id: target.id, absoluteStock: absolute });
      } else {
        const delta = toInt(payload.delta);
        if (Number.isNaN(delta)) {
          throw new HttpError(400, 'Delta must be an integer', 'Bad Request');
        }
        outcome = await repo.adjustStock(tx, { id: target.id, delta });
      }

      if (outcome.outcome === 'ok') {
        await movementsRepo.insert(tx, {
          companyId: outcome.companyId,
          productId: outcome.productId,
          delta: outcome.deltaApplied,
          balanceAfter: outcome.balanceAfter,
          reason,
        });
      }
      return outcome;
    });

    if (result.outcome === 'not-found') throw notFound('Inventory item', payload.id || payload.productId);
    if (result.outcome === 'below-zero') {
      throw new HttpError(400, 'Stock cannot go below 0', 'Bad Request');
    }
    return repo.findById(db, result.id);
  },

  /** GET /inventory/product/:productId/movements — newest-first ledger. */
  async listMovements(actor, productId, query = {}) {
    const companyId = resolveCompanyScope(actor, query.companyId);
    return movementsRepo.findRecent(db, {
      companyId,
      productId: String(productId).trim(),
      limit: Number(query.limit) || 50,
    });
  },

  async update(actor, id, payload = {}) {
    const existing = await repo.findById(db, id);
    assertVisible(existing, actor);
    const fields = {};
    if (payload.reorderLevel !== undefined) {
      const level = toInt(payload.reorderLevel);
      if (Number.isNaN(level) || level < 0) {
        throw new HttpError(400, 'Reorder level must be a non-negative integer', 'Bad Request');
      }
      fields.reorderLevel = level;
    }
    if (payload.location !== undefined) fields.location = String(payload.location).trim();
    if (payload.stock !== undefined) {
      const stock = toInt(payload.stock);
      if (Number.isNaN(stock) || stock < 0) {
        throw new HttpError(400, 'Stock must be a non-negative integer', 'Bad Request');
      }
      fields.stock = stock;
    }
    const updated = await repo.update(db, id, fields);
    if (!updated) throw notFound('Inventory item', id);
    return updated;
  },
};
