// Integration tests: real PostgreSQL (billbhai_test), real migrations, real
// HTTP over an ephemeral port. Run with `npm run test:integration`.
//
// Requires TEST_DATABASE_URL (see .env.example). The test database is
// rebuilt from scratch at the start of each run — never point it at your
// development database.

const { test, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');

const ROOT = path.join(__dirname, '..', '..');
const TEST_URL = process.env.TEST_DATABASE_URL
  || (() => {
    // Fall back to the .env file next to the backend root.
    try {
      const envFile = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
      const match = envFile.match(/^TEST_DATABASE_URL=(.+)$/m);
      if (match) return match[1].trim();
    } catch { /* no .env */ }
    return '';
  })();

if (!TEST_URL) {
  throw new Error('TEST_DATABASE_URL is required for integration tests');
}

// Must be set BEFORE any src/* module loads: dotenv never overrides existing
// env vars, so this pins both config and the app pool to the test database.
process.env.DATABASE_URL = TEST_URL;

let server;
let baseUrl;

function request(method, urlPath, { token, body, role } = {}) {
  return fetch(`${baseUrl}${urlPath}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(role ? { 'x-role': role } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function json(method, urlPath, options) {
  const response = await request(method, urlPath, options);
  const payload = await response.json().catch(() => null);
  return { status: response.status, body: payload };
}

const tokens = {};
async function login(username, password) {
  const cacheKey = `${username}:${password}`;
  if (!tokens[cacheKey]) {
    const res = await json('POST', '/api/auth/login', {
      body: { username, password },
    });
    assert.strictEqual(res.status, 200, `login as ${username} failed`);
    tokens[cacheKey] = res.body;
  }
  return tokens[cacheKey];
}

before(async () => {
  // Rebuild the test schema from zero to prove the migrations stand alone.
  const bootstrap = new Client({ connectionString: TEST_URL });
  await bootstrap.connect();
  await bootstrap.query(`
    DROP SCHEMA public CASCADE;
    CREATE SCHEMA public;
  `);

  const { runMigrations } = require('../../src/db/migrate');
  const { seed } = require('../../src/db/seed');

  await runMigrations(async () => {
    const client = new Client({ connectionString: TEST_URL });
    await client.connect();
    return client;
  });

  // Second pass must be a clean no-op.
  await runMigrations(async () => {
    const client = new Client({ connectionString: TEST_URL });
    await client.connect();
    return client;
  });

  await seed(bootstrap);
  await bootstrap.end();

  const app = require('../../src/app');

  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  const pool = require('../../src/db/pool');
  await pool.close();
});

test('health endpoint reports database connectivity', async () => {
  const res = await json('GET', '/api/health');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.database, 'up');
});

test('login succeeds with seeded credentials and issues a JWT', async () => {
  const admin = await login('admin', 'admin123');
  assert.ok(admin.token.split('.').length === 3, 'token is not a JWT');
  assert.strictEqual(admin.role, 'admin');
  assert.strictEqual(admin.companyId, 'BIZ-101');
});

test('login rejects a wrong password without leaking hash material', async () => {
  const res = await json('POST', '/api/auth/login', {
    body: { username: 'admin', password: 'nope' },
  });
  assert.strictEqual(res.status, 401);
});

test('seeded accounts can log in with their email alias', async () => {
  const res = await json('POST', '/api/auth/login', {
    body: { username: 'admin@billbhai.com', password: 'admin123' },
  });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.username, 'admin');
  assert.strictEqual(res.body.companyId, 'BIZ-101');
});

test('register provisions a company and its admin user transactionally', async () => {
  const res = await json('POST', '/api/auth/register', {
    body: {
      businessName: 'Dibiz Ventures',
      ownerName: 'Snigdha',
      email: 'owner@dibiz.test',
      phone: '9812345678',
      password: 'secret123',
    },
  });
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.role, 'admin');
  assert.match(res.body.companyId, /^BIZ-\d+$/);
  assert.ok(res.body.token.split('.').length === 3, 'register did not issue a JWT');
  assert.strictEqual(res.body.username, 'owner');

  // The returned credentials must work immediately, via both identities.
  const byEmail = await json('POST', '/api/auth/login', {
    body: { username: 'owner@dibiz.test', password: 'secret123' },
  });
  assert.strictEqual(byEmail.status, 200);
  const byUsername = await json('POST', '/api/auth/login', {
    body: { username: 'owner', password: 'secret123' },
  });
  assert.strictEqual(byUsername.status, 200);
  assert.strictEqual(byUsername.body.companyId, res.body.companyId);

  // The new admin is tenant-pinned like any other admin.
  const forbidden = await json('GET', '/api/users?companyId=BIZ-101', {
    token: res.body.token,
  });
  assert.strictEqual(forbidden.status, 200);
  for (const user of forbidden.body) {
    assert.strictEqual(user.companyId, res.body.companyId);
  }
});

test('register rejects duplicate emails, weak passwords and bad input', async () => {
  const dup = await json('POST', '/api/auth/register', {
    body: { businessName: 'Again', email: 'owner@dibiz.test', password: 'secret123' },
  });
  assert.strictEqual(dup.status, 409);

  const weak = await json('POST', '/api/auth/register', {
    body: { businessName: 'Weak Co', email: 'weak@test.io', password: '123' },
  });
  assert.strictEqual(weak.status, 400);

  const noEmail = await json('POST', '/api/auth/register', {
    body: { businessName: 'No Email Co', password: 'secret123' },
  });
  assert.strictEqual(noEmail.status, 400);

  const noName = await json('POST', '/api/auth/register', {
    body: { email: 'noname@test.io', password: 'secret123' },
  });
  assert.strictEqual(noName.status, 400);
});

test('user listings never expose password hashes', async () => {
  const admin = await login('admin', 'admin123');
  const res = await json('GET', '/api/users', { token: admin.token });
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.length > 0);
  for (const user of res.body) {
    assert.strictEqual(user.password, undefined);
    assert.strictEqual(user.passwordHash, undefined);
    assert.strictEqual(user.password_hash, undefined);
  }
});

test('products CRUD works and duplicate barcodes are rejected', async () => {
  const admin = await login('admin', 'admin123');
  const created = await json('POST', '/api/products', {
    token: admin.token,
    body: { name: 'Test Mangoes', category: 'Fruits', barcode: 'BAR-TEST-1', price: 99 },
  });
  assert.strictEqual(created.status, 201);
  assert.ok(created.body.id.startsWith('P'));

  const dup = await json('POST', '/api/products', {
    token: admin.token,
    body: { name: 'Copycat', barcode: 'BAR-TEST-1', price: 1 },
  });
  assert.strictEqual(dup.status, 409);

  const fetched = await json('GET', '/api/products/barcode/BAR-TEST-1', { token: admin.token });
  assert.strictEqual(fetched.status, 200);
  assert.strictEqual(fetched.body.name, 'Test Mangoes');

  const categories = await json('GET', '/api/products/categories', { token: admin.token });
  assert.ok(categories.body.includes('Fruits'));
});

test('customer phone numbers are unique per company and lookup works', async () => {
  const admin = await login('admin', 'admin123');
  const first = await json('POST', '/api/customers', {
    token: admin.token,
    body: { name: 'Unique Person', phone: '9000000001' },
  });
  assert.strictEqual(first.status, 201);

  const dup = await json('POST', '/api/customers', {
    token: admin.token,
    body: { name: 'Same Phone', phone: '9000000001' },
  });
  assert.strictEqual(dup.status, 409);

  const lookup = await json('GET', '/api/customers/phone/9000000001', { token: admin.token });
  assert.strictEqual(lookup.status, 200);
  assert.strictEqual(lookup.body.name, 'Unique Person');
});

test('order creation is transactional: stock decrements atomically', async () => {
  const cashier = await login('cashier', 'cashier123');
  const invBefore = await json('GET', '/api/inventory/product/P001', { token: cashier.token });
  assert.strictEqual(invBefore.status, 200);
  const stockBefore = invBefore.body.stock;

  const order = await json('POST', '/api/orders', {
    token: cashier.token,
    body: {
      customerId: 'CUS-001',
      orderType: 'pickup',
      paymentMethod: 'Cash',
      items: [{ productId: 'P001', quantity: 3, itemPrice: 120 }],
    },
  });
  assert.strictEqual(order.status, 201);
  assert.strictEqual(order.body.itemsCount, 3);
  assert.strictEqual(order.body.total, 360);
  assert.ok(order.body.id.startsWith('ORD-'), 'generated business id expected');
  assert.strictEqual(order.body.items.length, 1);

  const invAfter = await json('GET', '/api/inventory/product/P001', { token: cashier.token });
  assert.strictEqual(invAfter.body.stock, stockBefore - 3, 'stock must decrement exactly once');

  // Order detail returns the same snapshot with items attached.
  const detail = await json('GET', `/api/orders/${order.body.id}`, { token: cashier.token });
  assert.strictEqual(detail.status, 200);
  assert.strictEqual(detail.body.total, 360);
});

test('insufficient stock rolls the entire order back', async () => {
  const cashier = await login('cashier', 'cashier123');
  const ordersBefore = await json('GET', '/api/orders', { token: cashier.token });
  const countBefore = ordersBefore.body.length;
  const invBefore = await json('GET', '/api/inventory/product/P002', { token: cashier.token });
  const stockBefore = invBefore.body.stock;

  const failed = await json('POST', '/api/orders', {
    token: cashier.token,
    body: {
      items: [{ productId: 'P002', quantity: stockBefore + 1000, itemPrice: 10 }],
    },
  });
  assert.strictEqual(failed.status, 409);

  const ordersAfter = await json('GET', '/api/orders', { token: cashier.token });
  assert.strictEqual(ordersAfter.body.length, countBefore, 'no partial order may persist');
  const invAfter = await json('GET', '/api/inventory/product/P002', { token: cashier.token });
  assert.strictEqual(invAfter.body.stock, stockBefore, 'stock must be restored on rollback');
});

test('orders referencing unknown products are rejected cleanly', async () => {
  const cashier = await login('cashier', 'cashier123');
  const res = await json('POST', '/api/orders', {
    token: cashier.token,
    body: { items: [{ productId: 'P-NOPE', quantity: 1, itemPrice: 5 }] },
  });
  assert.strictEqual(res.status, 400);
});

test('WELCOME10 promo applies a 10% discount; junk codes fail', async () => {
  const cashier = await login('cashier', 'cashier123');
  const good = await json('POST', '/api/orders', {
    token: cashier.token,
    body: {
      items: [{ productId: 'P005', quantity: 2, itemPrice: 60 }],
      discountAmount: 999,
      promoCode: 'WELCOME10',
    },
  });
  assert.strictEqual(good.status, 201);
  assert.strictEqual(good.body.discountAmount, 12); // 10% of 120

  const bad = await json('POST', '/api/orders', {
    token: cashier.token,
    body: {
      items: [{ productId: 'P006', quantity: 1, itemPrice: 45 }],
      promoCode: 'SCAM50',
    },
  });
  assert.strictEqual(bad.status, 400);
});

test('bill then split payments accumulate to settled', async () => {
  const cashier = await login('cashier', 'cashier123');
  const order = await json('POST', '/api/orders', {
    token: cashier.token,
    body: { items: [{ productId: 'P007', quantity: 2, itemPrice: 54 }] },
  });
  assert.strictEqual(order.status, 201);
  assert.strictEqual(order.body.total, 108);

  const bill = await json('POST', '/api/orders/bills', {
    token: cashier.token,
    body: { orderId: order.body.id },
  });
  assert.strictEqual(bill.status, 201);
  assert.ok(bill.body.billNo.startsWith('BILL-'));

  // One bill per order is still the rule.
  const dupBill = await json('POST', '/api/orders/bills', {
    token: cashier.token,
    body: { orderId: order.body.id },
  });
  assert.strictEqual(dupBill.status, 409);

  // First split payment: partial coverage leaves a balance.
  const partial = await json('POST', '/api/orders/payments', {
    token: cashier.token,
    body: { billNo: bill.body.billNo, paymentMethod: 'UPI', amountPaid: 50 },
  });
  assert.strictEqual(partial.status, 201);
  assert.strictEqual(partial.body.paymentStatus, 'Partial');
  assert.strictEqual(partial.body.paidSoFar, 50);
  assert.strictEqual(partial.body.balanceDue, 58);

  // Second split settles it (cash covers the remainder).
  const settle = await json('POST', '/api/orders/payments', {
    token: cashier.token,
    body: { billNo: bill.body.billNo, paymentMethod: 'Cash', amountPaid: 58 },
  });
  assert.strictEqual(settle.status, 201);
  assert.strictEqual(settle.body.paymentStatus, 'Paid');
  assert.strictEqual(settle.body.balanceDue, 0);

  // Summary view shows both rows and the settled flag.
  const summary = await json('GET', `/api/orders/payments/bill/${bill.body.billNo}`, {
    token: cashier.token,
  });
  assert.strictEqual(summary.status, 200);
  assert.strictEqual(summary.body.payments.length, 2);
  assert.strictEqual(summary.body.amountDue, 108);
  assert.strictEqual(summary.body.settled, true);

  // Legacy single-payment getter still answers with the most recent row.
  const latest = await json('GET', `/api/orders/payments/${bill.body.billNo}`, {
    token: cashier.token,
  });
  assert.strictEqual(latest.status, 200);
  assert.strictEqual(latest.body.paymentMethod, 'Cash');

  // A billed order is financially significant — deletion must be blocked.
  const deleteAttempt = await json('DELETE', `/api/orders/${order.body.id}`, {
    token: (await login('admin', 'admin123')).token,
  });
  assert.strictEqual(deleteAttempt.status, 409);
});

test('held bills persist, resume-ready, and stay tenant-scoped', async () => {
  const cashier = await login('cashier', 'cashier123');
  const cart = {
    items: [{ productId: 'P006', name: 'Bread Loaf', quantity: 2, itemPrice: 45 }],
    customerName: 'Meera Shah',
  };
  const created = await json('POST', '/api/orders/holds', {
    token: cashier.token,
    body: { label: 'Counter 2 — waiting on UPI', cart, total: 90 },
  });
  assert.strictEqual(created.status, 201);
  assert.ok(created.body.id.startsWith('HOLD-'));
  assert.deepStrictEqual(created.body.cart, cart);

  const listed = await json('GET', '/api/orders/holds', { token: cashier.token });
  assert.strictEqual(listed.status, 200);
  assert.ok(listed.body.some((hold) => hold.id === created.body.id));

  // Resume prep: update the cart (quantity bumped), then read it back.
  const updated = await json('PUT', `/api/orders/holds/${created.body.id}`, {
    token: cashier.token,
    body: { total: 135, cart: { ...cart, items: [{ ...cart.items[0], quantity: 3 }] } },
  });
  assert.strictEqual(updated.status, 200);
  assert.strictEqual(updated.body.total, 135);
  assert.strictEqual(updated.body.cart.items[0].quantity, 3);

  // Tenant pinning: an admin from a different company (registered fresh)
  // cannot see or discard another tenant's hold.
  const outsiderAdmin = await json('POST', '/api/auth/register', {
    body: { businessName: 'Outsider Traders', email: `outsider-admin@test.io`, password: 'secret123' },
  });
  assert.strictEqual(outsiderAdmin.status, 201);
  assert.notStrictEqual(outsiderAdmin.body.companyId, created.body.companyId);
  const foreignGet = await json('GET', `/api/orders/holds/${created.body.id}`, {
    token: outsiderAdmin.body.token,
  });
  assert.strictEqual(foreignGet.status, 404);
  const foreignList = await json('GET', '/api/orders/holds', {
    token: outsiderAdmin.body.token,
  });
  assert.strictEqual(foreignList.status, 200);
  assert.ok(!foreignList.body.some((hold) => hold.id === created.body.id));

  const discarded = await json('DELETE', `/api/orders/holds/${created.body.id}`, {
    token: cashier.token,
  });
  assert.strictEqual(discarded.status, 200);

  const badCart = await json('POST', '/api/orders/holds', {
    token: cashier.token,
    body: { label: 'no cart' },
  });
  assert.strictEqual(badCart.status, 400);
});

test('customer profile aggregates spend and outstanding from real orders', async () => {
  const admin = await login('admin', 'admin123');
  const profile = await json('GET', '/api/customers/CUS-001/profile', { token: admin.token });
  assert.strictEqual(profile.status, 200);
  assert.strictEqual(profile.body.id, 'CUS-001');
  assert.ok(profile.body.orderCount >= 1, 'earlier tests placed orders for CUS-001');
  assert.ok(profile.body.totalSpend > 0);
  assert.ok(profile.body.lastPurchaseAt);

  // The split-payment test above left CUS-007-free bills fully settled;
  // outstanding must never go negative even with over-tendered cash.
  assert.ok(profile.body.outstanding >= 0);

  const history = await json('GET', '/api/orders?customerId=CUS-001', { token: admin.token });
  assert.strictEqual(history.status, 200);
  assert.ok(Array.isArray(history.body));
  for (const order of history.body) {
    assert.strictEqual(order.customerId, 'CUS-001');
  }

  // Unknown customer → clean 404.
  const missing = await json('GET', '/api/customers/CUS-99999/profile', { token: admin.token });
  assert.strictEqual(missing.status, 404);
});

test('CSV bulk import creates products and skips bad rows with reasons', async () => {
  const manager = await login('inventorymanager', 'inventory123');
  const csv = [
    'name,category,barcode,price,gstRate,purchasePrice,size,stock,reorderLevel',
    'Imported Basmati 5kg,Groceries,BAR-IMP-1,380,5,300,5kg,10,4',
    'Duplicate Barcode Item,Groceries,BAR-IMP-1,100,,,',
    'Bad Price Item,Groceries,BAR-IMP-2,-5,,,',
    'No Stock Item,Groceries,,25,,,pack',
    '"Quoted, Comma Name",Snacks,BAR-IMP-3,45,12,30,,,',
  ].join('\n');

  const imported = await json('POST', '/api/products/import', {
    token: manager.token,
    body: { csv },
  });
  assert.strictEqual(imported.status, 201);
  assert.strictEqual(imported.body.imported, 3);
  assert.strictEqual(imported.body.failed.length, 2);
  assert.ok(imported.body.failed.some((f) => f.message.includes('duplicate barcode')));
  assert.ok(imported.body.failed.some((f) => f.message.includes('price cannot be negative')));

  // Stock column produced a live inventory row for the manager's company.
  const firstProduct = imported.body.products.find((p) => p.barcode === 'BAR-IMP-1');
  assert.ok(firstProduct);
  assert.strictEqual(firstProduct.gstRate, 5);
  assert.strictEqual(firstProduct.purchasePrice, 300);
  const invRow = await json('GET', `/api/inventory/product/${firstProduct.id}`, {
    token: manager.token,
  });
  assert.strictEqual(invRow.status, 200);
  assert.strictEqual(invRow.body.stock, 10);
  assert.strictEqual(invRow.body.reorderLevel, 4);

  // Quoted-name product round-trips intact.
  const quoted = imported.body.products.find((p) => p.name === 'Quoted, Comma Name');
  assert.ok(quoted, 'quoted CSV cell must parse correctly');
});

test('inventory adjustments guard against negative stock', async () => {
  const manager = await login('inventorymanager', 'inventory123');
  const belowZero = await json('POST', '/api/inventory/adjust', {
    token: manager.token,
    body: { productId: 'P010', delta: -100000 },
  });
  assert.strictEqual(belowZero.status, 400);
  assert.strictEqual(belowZero.body.message, 'Stock cannot go below 0');

  const ok = await json('POST', '/api/inventory/adjust', {
    token: manager.token,
    body: { productId: 'P010', delta: -2 },
  });
  assert.strictEqual(ok.status, 200);
  assert.ok(ok.body.stock >= 0);

  const absolute = await json('POST', '/api/inventory/adjust', {
    token: manager.token,
    body: { productId: 'P010', stock: 50 },
  });
  assert.strictEqual(absolute.status, 200);
  assert.strictEqual(absolute.body.stock, 50);

  const lowStock = await json('GET', '/api/inventory/low-stock', { token: manager.token });
  assert.ok(Array.isArray(lowStock.body));
});

test('tenant isolation: staff cannot read other companies through query overrides', async () => {
  const admin = await login('admin', 'admin123'); // BIZ-101
  const usersOfOtherTenant = await json('GET', '/api/users?companyId=BIZ-102', {
    token: admin.token,
  });
  assert.strictEqual(usersOfOtherTenant.status, 200);
  assert.deepStrictEqual(
    new Set(usersOfOtherTenant.body.map((u) => u.companyId)),
    new Set(['BIZ-101']),
    '?companyId override must be ignored for non-superusers',
  );

  const superuser = await login('chirag', 'chirag1234');
  const crossRead = await json('GET', '/api/users?companyId=BIZ-102', {
    token: superuser.token,
  });
  assert.ok(crossRead.body.some((u) => u.companyId === 'BIZ-102'),
    'superuser may target any tenant');
});

test('deleting a company with linked records fails gracefully', async () => {
  const superuser = await login('chirag', 'chirag1234');
  const res = await json('DELETE', '/api/companies/BIZ-101', { token: superuser.token });
  assert.strictEqual(res.status, 409);
  assert.match(res.body.message, /linked records/);
});

test('reports endpoints aggregate from PostgreSQL', async () => {
  const admin = await login('admin', 'admin123');
  const sales = await json('GET', '/api/reports/sales', { token: admin.token });
  assert.strictEqual(sales.status, 200);
  assert.ok(sales.body.orderCount > 0);
  assert.ok(typeof sales.body.avgOrderValue === 'number');

  const inventory = await json('GET', '/api/reports/inventory', { token: admin.token });
  assert.strictEqual(inventory.status, 200);
  assert.ok(inventory.body.totalSKUs > 0);

  const returnsReport = await json('GET', '/api/reports/returns', { token: admin.token });
  assert.strictEqual(returnsReport.status, 200);
});

test('suppliers CRUD round-trips', async () => {
  const manager = await login('inventorymanager', 'inventory123');
  const created = await json('POST', '/api/suppliers', {
    token: manager.token,
    body: { name: 'Fresh Farms Co', mobileNo: '9812345678' },
  });
  assert.strictEqual(created.status, 201);
  assert.ok(created.body.id.startsWith('SUP-'));

  const updated = await json('PUT', `/api/suppliers/${created.body.id}`, {
    token: manager.token,
    body: { address: 'Nashik' },
  });
  assert.strictEqual(updated.status, 200);
  assert.strictEqual(updated.body.address, 'Nashik');

  const removed = await json('DELETE', `/api/suppliers/${created.body.id}`, {
    token: (await login('admin', 'admin123')).token,
  });
  assert.strictEqual(removed.status, 200);
});

test('stock movements ledger records sales and adjustments', async () => {
  const admin = await login('admin', 'admin123');

  // A sale writes a 'sale' movement referencing the order id.
  const order = await json('POST', '/api/orders', {
    token: admin.token,
    body: { items: [{ productId: 'P001', quantity: 2, itemPrice: 380 }] },
  });
  assert.strictEqual(order.status, 201);

  const saleMoves = await json('GET', '/api/inventory/product/P001/movements?limit=50', {
    token: admin.token,
  });
  assert.strictEqual(saleMoves.status, 200);
  const saleEntry = saleMoves.body.find(
    (m) => m.reason === 'sale' && m.referenceId === order.body.id,
  );
  assert.ok(saleEntry, 'no sale movement recorded for the order');
  assert.strictEqual(saleEntry.delta, -2);
  assert.ok(Number.isInteger(saleEntry.balanceAfter) && saleEntry.balanceAfter >= 0);

  // An adjustment appends a movement whose balance matches live stock.
  const adjusted = await json('POST', '/api/inventory/adjust', {
    token: admin.token,
    body: { productId: 'P001', delta: 5 },
  });
  assert.strictEqual(adjusted.status, 200);
  const afterAdjust = await json('GET', '/api/inventory/product/P001/movements', {
    token: admin.token,
  });
  const newest = afterAdjust.body[0];
  assert.strictEqual(newest.reason, 'adjustment');
  assert.strictEqual(newest.delta, 5);
  assert.strictEqual(newest.balanceAfter, adjusted.body.stock);

  // Tenant pinning applies to the ledger too.
  const cashier = await login('cashier', 'cashier123');
  const pinned = await json('GET', '/api/inventory/product/P001/movements?companyId=BIZ-102', {
    token: cashier.token,
  });
  assert.strictEqual(pinned.status, 200);
  for (const movement of pinned.body) {
    assert.strictEqual(movement.companyId, 'BIZ-101');
  }
});

test('top products report aggregates sold units', async () => {
  const admin = await login('admin', 'admin123');
  const res = await json('GET', '/api/reports/top-products?days=30&limit=10', {
    token: admin.token,
  });
  assert.strictEqual(res.status, 200);
  assert.ok(Array.isArray(res.body));
  const p1 = res.body.find((row) => row.productId === 'P001');
  assert.ok(p1, 'P001 has been sold in earlier tests and must appear');
  assert.ok(p1.unitsSold >= 2, `expected P001 unitsSold >= 2, got ${p1.unitsSold}`);
});

test('products accept gstRate and purchasePrice and round-trip them', async () => {
  const admin = await login('admin', 'admin123');
  const created = await json('POST', '/api/products', {
    token: admin.token,
    body: { name: 'GST Test Item', category: 'Snacks', price: 100, gstRate: 18, purchasePrice: 70 },
  });
  assert.strictEqual(created.status, 201);
  assert.strictEqual(created.body.gstRate, 18);
  assert.strictEqual(created.body.purchasePrice, 70);

  const fetched = await json('GET', `/api/products/${created.body.id}`, { token: admin.token });
  assert.strictEqual(fetched.status, 200);
  assert.strictEqual(fetched.body.gstRate, 18);
  assert.strictEqual(fetched.body.purchasePrice, 70);

  // Legacy payloads without the new fields keep working (defaults apply).
  const legacy = await json('POST', '/api/products', {
    token: admin.token,
    body: { name: 'Legacy Item', category: 'Snacks', price: 10 },
  });
  assert.strictEqual(legacy.status, 201);
  assert.strictEqual(legacy.body.gstRate, 0);
  assert.strictEqual(legacy.body.purchasePrice, 0);
});
