const db = require('../db/pool');
const reportsRepo = require('../repositories/reports');
const { resolveCompanyScope } = require('./scope');

function scopeFrom(actor, queryCompanyId) {
  return { companyId: resolveCompanyScope(actor, queryCompanyId) };
}

module.exports = {
  async salesSummary(actor, query = {}) {
    return reportsRepo.salesSummary(db, scopeFrom(actor, query.companyId));
  },

  async inventoryStatus(actor, query = {}) {
    return reportsRepo.inventoryStatus(db, scopeFrom(actor, query.companyId));
  },

  async returnsSummary(actor, query = {}) {
    return reportsRepo.returnsSummary(db, scopeFrom(actor, query.companyId));
  },
};
