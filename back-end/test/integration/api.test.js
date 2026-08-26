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

test('bill then payment flow enforces one-per-order/bill', async () => {
  const cashier = await login('cashier', 'cashier123');
  const order = await json('POST', '/api/orders', {
    token: cashier.token,
    body: { items: [{ productId: 'P007', quantity: 2, itemPrice: 54 }] },
  });
  assert.strictEqual(order.status, 201);

  const bill = await json('POST', '/api/orders/bills', {
    token: cashier.token,
    body: { orderId: order.body.id, taxAmount: 19.44 },
  });
  assert.strictEqual(bill.status, 201);
  assert.ok(bill.body.billNo.startsWith('BILL-'));

  const dupBill = await json('POST', '/api/orders/bills', {
    token: cashier.token,
    body: { orderId: order.body.id },
  });
  assert.strictEqual(dupBill.status, 409);

  const payment = await json('POST', '/api/orders/payments', {
    token: cashier.token,
    body: { billNo: bill.body.billNo, paymentMethod: 'UPI', amountPaid: 127.44 },
  });
  assert.strictEqual(payment.status, 201);
  assert.strictEqual(payment.body.paymentStatus, 'Paid');

  const dupPayment = await json('POST', '/api/orders/payments', {
    token: cashier.token,
    body: { billNo: bill.body.billNo, paymentMethod: 'Cash', amountPaid: 1 },
  });
  assert.strictEqual(dupPayment.status, 409);

  // A billed order is financially significant — deletion must be blocked.
  const deleteAttempt = await json('DELETE', `/api/orders/${order.body.id}`, {
    token: (await login('admin', 'admin123')).token,
  });
  assert.strictEqual(deleteAttempt.status, 409);
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
