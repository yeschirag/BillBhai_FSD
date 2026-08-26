const { test } = require('node:test');
const assert = require('node:assert');
const { mapRow } = require('../../src/repositories/mappers');
const {
  normalizeRole,
  resolveCompanyScope,
  resolveCreateCompany,
  belongsToScope,
} = require('../../src/services/scope');
const { computeStatus } = require('../../src/repositories/inventory');

test('mapRow builds parameterized SET clauses from camelCase fields', () => {
  const { setClause, values } = mapRow(
    { adminName: 'A', profit: 5, bogus: 'ignored' },
    { adminName: 'admin_name', profit: 'profit' },
  );
  assert.strictEqual(setClause, 'admin_name = $1, profit = $2');
  assert.deepStrictEqual(values, ['A', 5]);
});

test('normalizeRole collapses case and whitespace', () => {
  assert.strictEqual(normalizeRole(' Inventory Manager '), 'inventorymanager');
  assert.strictEqual(normalizeRole(undefined), '');
});

test('non-superusers are pinned to their own company scope', () => {
  const cashier = { role: 'cashier', companyId: 'BIZ-101' };
  assert.strictEqual(resolveCompanyScope(cashier, 'BIZ-102'), 'BIZ-101');
  const superuser = { role: 'superuser', companyId: 'BIZ-101' };
  assert.strictEqual(resolveCompanyScope(superuser, 'BIZ-102'), 'BIZ-102');
  assert.strictEqual(resolveCompanyScope(superuser, ''), '');
});

test('resolveCreateCompany ignores requested company for non-superusers', () => {
  const admin = { role: 'admin', companyId: 'BIZ-101' };
  assert.strictEqual(resolveCreateCompany(admin, 'BIZ-102'), 'BIZ-101');
  const superuser = { role: 'superuser', companyId: 'BIZ-101' };
  assert.strictEqual(resolveCreateCompany(superuser, 'BIZ-102'), 'BIZ-102');
});

test('belongsToScope enforces tenant boundaries with superuser override', () => {
  const record = { companyId: 'BIZ-101' };
  assert.strictEqual(belongsToScope(record, { role: 'cashier', companyId: 'BIZ-101' }), true);
  assert.strictEqual(belongsToScope(record, { role: 'cashier', companyId: 'BIZ-999' }), false);
  assert.strictEqual(belongsToScope(record, { role: 'superuser', companyId: 'BIZ-999' }), true);
  assert.strictEqual(belongsToScope(null, { role: 'superuser' }), false);
});

test('computeStatus thresholds match the legacy service', () => {
  assert.strictEqual(computeStatus(0, 10), 'Out of Stock');
  assert.strictEqual(computeStatus(5, 10), 'Critical');
  assert.strictEqual(computeStatus(9, 10), 'Low Stock');
  assert.strictEqual(computeStatus(11, 10), 'In Stock');
});
