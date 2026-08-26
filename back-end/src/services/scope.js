// Tenant scoping helpers.
//
// Security model: every table carries company_id. A superuser may target any
// tenant explicitly (?companyId=…); every other role is pinned to the tenant
// embedded in their JWT. The previous implementation accepted query.companyId
// from ANY role, letting a cashier read another tenant's data — closed here.

function normalizeRole(role) {
  return String(role || '').trim().toLowerCase().replace(/\s+/g, '');
}

/**
 * Company filter for queries initiated by `user`.
 * Returns '' meaning "no filter" (superuser without explicit target).
 */
function resolveCompanyScope(user, queryCompanyId) {
  if (normalizeRole(user?.role) === 'superuser') {
    return String(queryCompanyId || '').trim();
  }
  return String(user?.companyId || '').trim();
}

/** The tenant a new record belongs to. Non-superusers cannot choose. */
function resolveCreateCompany(user, requestedCompanyId, fallback = '') {
  const role = normalizeRole(user?.role);
  const own = String(user?.companyId || '').trim();
  if (role === 'superuser') {
    return String(requestedCompanyId || '').trim() || own || fallback;
  }
  return own || fallback;
}

/** True when `record` may be seen/modified by `user`. */
function belongsToScope(record, user) {
  if (!record) return false;
  if (normalizeRole(user?.role) === 'superuser') return true;
  const own = String(user?.companyId || '').trim();
  return !own || record.companyId === own;
}

module.exports = { normalizeRole, resolveCompanyScope, resolveCreateCompany, belongsToScope };
