const express = require('express');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/auth');
const {
  seedUsers,
  seedProducts,
  seedOrders,
  seedCompanies,
  seedInventory,
  seedCustomers,
  seedDeliveries,
  seedReturns,
} = require('../data/seed-data');

const router = express.Router();

function buildId(prefix) {
  return `${prefix}-${Date.now()}`;
}

function notFound(res, label, id) {
  return res.status(404).json({
    statusCode: 404,
    message: `${label} ${id} not found`,
    error: 'Not Found',
  });
}

function pickCompanyScope(req) {
  if (String(req.user?.role || '').toLowerCase() === 'superuser') {
    return String(req.query.companyId || '').trim();
  }
  return String(req.query.companyId || req.user?.companyId || '').trim();
}

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    application: 'BillBhai Backend',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

router.post('/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = seedUsers.find(
    (entry) => entry.username === username && entry.password === password,
  );

  if (!user) {
    return res.status(401).json({
      statusCode: 401,
      message: 'Invalid username or password',
      error: 'Unauthorized',
    });
  }

  const token = jwt.sign(
    {
      userId: user.id,
      username: user.username,
      role: user.role,
      companyId: user.companyId,
      email: user.email,
    },
    process.env.JWT_SECRET || 'billbhai-super-secret-key-change-in-production',
    { expiresIn: '8h' },
  );

  return res.json({
    id: user.id,
    username: user.username,
    role: user.role,
    email: user.email,
    companyId: user.companyId,
    token,
  });
});

router.get(
  '/products',
  authMiddleware(['superuser', 'admin', 'cashier', 'inventorymanager', 'customer']),
  (req, res) => {
    res.json(seedProducts);
  },
);

router.get(
  '/orders',
  authMiddleware(['superuser', 'admin', 'cashier', 'returnhandler', 'deliveryops']),
  (req, res) => {
    res.json(seedOrders);
  },
);

router.get('/orders/:id', authMiddleware(['superuser','admin','cashier','returnhandler','deliveryops']), (req,res) => {
  const order = seedOrders.find((entry) => entry.id === req.params.id);
  if (!order) {
    return res.status(404).json({ statusCode:404, message:`Order ${req.params.id} not found`, error:'Not Found' });
  }
  return res.json(order);
});

router.post('/orders', authMiddleware(['superuser','admin','cashier']), (req,res) => {
  const payload = req.body || {};
  const orderId = `ORD-${Date.now()}`;
  const newOrder = {
    id: orderId,
    ...payload,
    status: 'Processing',
    orderDate: new Date().toISOString(),
  };

  seedOrders.unshift(newOrder);
  return res.status(201).json(newOrder);
});

/* --------------------------------------------------------------------------
   Companies
   -------------------------------------------------------------------------- */
router.get('/companies', authMiddleware(['superuser']), (req, res) => {
  res.json(seedCompanies);
});

router.get('/companies/:id', authMiddleware(['superuser', 'admin']), (req, res) => {
  const company = seedCompanies.find((entry) => entry.id === req.params.id);
  if (!company) {
    return notFound(res, 'Company', req.params.id);
  }
  return res.json(company);
});

router.post('/companies', authMiddleware(['superuser']), (req, res) => {
  const payload = req.body || {};
  const company = {
    id: payload.id || buildId('BIZ'),
    name: payload.name || 'Untitled Business',
    owner: payload.owner || 'Unknown Owner',
    adminName: payload.adminName || payload.owner || 'Unassigned',
    type: payload.type || 'Retail',
    email: payload.email || '',
    phone: payload.phone || payload.mobileNo || '',
    status: payload.status || 'Trial',
    productsPlan: payload.productsPlan || 'Core POS',
    tenureMonths: Number(payload.tenureMonths || 0),
    storesCount: Number(payload.storesCount || 0),
    profit: Number(payload.profit || 0),
    paymentDue: Number(payload.paymentDue || 0),
  };
  seedCompanies.push(company);
  return res.status(201).json(company);
});

router.put('/companies/:id', authMiddleware(['superuser']), (req, res) => {
  const company = seedCompanies.find((entry) => entry.id === req.params.id);
  if (!company) {
    return notFound(res, 'Company', req.params.id);
  }
  Object.assign(company, req.body || {}, { id: company.id });
  return res.json(company);
});

router.delete('/companies/:id', authMiddleware(['superuser']), (req, res) => {
  const index = seedCompanies.findIndex((entry) => entry.id === req.params.id);
  if (index === -1) {
    return notFound(res, 'Company', req.params.id);
  }
  seedCompanies.splice(index, 1);
  return res.json({ statusCode: 200, message: `Company ${req.params.id} deleted` });
});

/* --------------------------------------------------------------------------
   Users (staff accounts)
   -------------------------------------------------------------------------- */
router.get('/users', authMiddleware(['superuser', 'admin']), (req, res) => {
  const scope = pickCompanyScope(req);
  const users = scope
    ? seedUsers.filter((entry) => entry.companyId === scope)
    : seedUsers;
  res.json(users);
});

router.get('/users/:id', authMiddleware(['superuser', 'admin']), (req, res) => {
  const user = seedUsers.find((entry) => entry.id === req.params.id);
  if (!user) {
    return notFound(res, 'User', req.params.id);
  }
  return res.json(user);
});

router.post('/users', authMiddleware(['superuser', 'admin']), (req, res) => {
  const payload = req.body || {};
  if (!payload.username || !payload.name) {
    return res.status(400).json({
      statusCode: 400,
      message: 'Username and name are required',
      error: 'Bad Request',
    });
  }
  if (seedUsers.some((entry) => entry.username === payload.username)) {
    return res.status(409).json({
      statusCode: 409,
      message: `Username ${payload.username} is already taken`,
      error: 'Conflict',
    });
  }
  const user = {
    id: buildId('USR'),
    companyId: payload.companyId || req.user?.companyId || 'BIZ-101',
    name: payload.name,
    role: payload.role || 'cashier',
    email: payload.email || '',
    mobileNo: payload.phone || payload.mobileNo || '',
    username: payload.username,
    password: payload.password || 'welcome123',
    status: payload.status || 'Active',
  };
  seedUsers.push(user);
  return res.status(201).json(user);
});

router.put('/users/:id', authMiddleware(['superuser', 'admin']), (req, res) => {
  const user = seedUsers.find((entry) => entry.id === req.params.id);
  if (!user) {
    return notFound(res, 'User', req.params.id);
  }
  const changes = { ...(req.body || {}) };
  delete changes.id;
  delete changes.username;
  Object.assign(user, changes);
  return res.json(user);
});

router.delete('/users/:id', authMiddleware(['superuser', 'admin']), (req, res) => {
  const index = seedUsers.findIndex((entry) => entry.id === req.params.id);
  if (index === -1) {
    return notFound(res, 'User', req.params.id);
  }
  if (seedUsers[index].role === 'superuser') {
    return res.status(403).json({
      statusCode: 403,
      message: 'Superuser accounts cannot be deleted',
      error: 'Forbidden',
    });
  }
  seedUsers.splice(index, 1);
  return res.json({ statusCode: 200, message: `User ${req.params.id} deleted` });
});

/* --------------------------------------------------------------------------
   Customers
   -------------------------------------------------------------------------- */
router.get('/customers', authMiddleware(['superuser', 'admin', 'cashier', 'customer']), (req, res) => {
  const scope = pickCompanyScope(req);
  const customers = scope
    ? seedCustomers.filter((entry) => entry.companyId === scope)
    : seedCustomers;
  res.json(customers);
});

router.get('/customers/phone/:phone', authMiddleware(['superuser', 'admin', 'cashier', 'customer']), (req, res) => {
  const customer = seedCustomers.find((entry) => entry.phone === req.params.phone);
  if (!customer) {
    return notFound(res, 'Customer', req.params.phone);
  }
  return res.json(customer);
});

router.get('/customers/:id', authMiddleware(['superuser', 'admin', 'cashier', 'customer']), (req, res) => {
  const customer = seedCustomers.find((entry) => entry.id === req.params.id);
  if (!customer) {
    return notFound(res, 'Customer', req.params.id);
  }
  return res.json(customer);
});

router.post('/customers', authMiddleware(['superuser', 'admin', 'cashier', 'customer']), (req, res) => {
  const payload = req.body || {};
  const customer = {
    id: buildId('CUS'),
    companyId: payload.companyId || req.user?.companyId || 'BIZ-101',
    phone: String(payload.phone || payload.mobileNo || '').trim(),
    name: payload.name || 'Walk-in',
    email: payload.email || '',
    address: payload.address || '',
    notes: payload.notes || '',
  };
  seedCustomers.push(customer);
  return res.status(201).json(customer);
});

router.put('/customers/:id', authMiddleware(['superuser', 'admin', 'cashier', 'customer']), (req, res) => {
  const customer = seedCustomers.find((entry) => entry.id === req.params.id);
  if (!customer) {
    return notFound(res, 'Customer', req.params.id);
  }
  Object.assign(customer, req.body || {}, { id: customer.id });
  return res.json(customer);
});

router.delete('/customers/:id', authMiddleware(['superuser', 'admin']), (req, res) => {
  const index = seedCustomers.findIndex((entry) => entry.id === req.params.id);
  if (index === -1) {
    return notFound(res, 'Customer', req.params.id);
  }
  seedCustomers.splice(index, 1);
  return res.json({ statusCode: 200, message: `Customer ${req.params.id} deleted` });
});

/* --------------------------------------------------------------------------
   Inventory
   -------------------------------------------------------------------------- */
router.get('/inventory', authMiddleware(['superuser', 'admin', 'inventorymanager', 'cashier']), (req, res) => {
  const scope = pickCompanyScope(req);
  const items = scope
    ? seedInventory.filter((entry) => entry.companyId === scope)
    : seedInventory;
  res.json(items);
});

router.get('/inventory/low-stock', authMiddleware(['superuser', 'admin', 'inventorymanager', 'cashier']), (req, res) => {
  const scope = pickCompanyScope(req);
  return res.json(
    seedInventory.filter(
      (entry) => (!scope || entry.companyId === scope)
        && Number(entry.stock || 0) <= Number(entry.reorderLevel || 0),
    ),
  );
});

router.get('/inventory/product/:productId', authMiddleware(['superuser', 'admin', 'inventorymanager', 'cashier']), (req, res) => {
  const item = seedInventory.find((entry) => entry.productId === req.params.productId);
  if (!item) {
    return notFound(res, 'Inventory item for product', req.params.productId);
  }
  return res.json(item);
});

router.post('/inventory/adjust', authMiddleware(['superuser', 'admin', 'inventorymanager']), (req, res) => {
  const payload = req.body || {};
  const item = seedInventory.find(
    (entry) => entry.id === payload.id || entry.productId === payload.productId,
  );
  if (!item) {
    return notFound(res, 'Inventory item', payload.id || payload.productId);
  }
  if (payload.stock !== undefined) {
    item.stock = Number(payload.stock);
  } else {
    item.stock = Number(item.stock || 0) + Number(payload.delta || 0);
  }
  item.lastUpdated = new Date().toISOString();
  return res.json(item);
});

router.get('/inventory/:id', authMiddleware(['superuser', 'admin', 'inventorymanager', 'cashier']), (req, res) => {
  const item = seedInventory.find((entry) => entry.id === req.params.id);
  if (!item) {
    return notFound(res, 'Inventory item', req.params.id);
  }
  return res.json(item);
});

router.put('/inventory/:id', authMiddleware(['superuser', 'admin', 'inventorymanager']), (req, res) => {
  const item = seedInventory.find((entry) => entry.id === req.params.id);
  if (!item) {
    return notFound(res, 'Inventory item', req.params.id);
  }
  Object.assign(item, req.body || {}, { id: item.id });
  item.lastUpdated = new Date().toISOString();
  return res.json(item);
});

/* --------------------------------------------------------------------------
   Deliveries
   -------------------------------------------------------------------------- */
router.get('/deliveries', authMiddleware(['superuser', 'admin', 'deliveryops', 'returnhandler', 'cashier']), (req, res) => {
  const scope = pickCompanyScope(req);
  const status = String(req.query.status || '').trim().toLowerCase();
  let deliveries = scope
    ? seedDeliveries.filter((entry) => entry.companyId === scope)
    : seedDeliveries;
  if (status) {
    deliveries = deliveries.filter((entry) => String(entry.status || '').toLowerCase().includes(status));
  }
  res.json(deliveries);
});

router.get('/deliveries/order/:orderId', authMiddleware(['superuser', 'admin', 'deliveryops', 'returnhandler', 'cashier']), (req, res) => {
  const delivery = seedDeliveries.find((entry) => entry.oid === req.params.orderId);
  if (!delivery) {
    return notFound(res, 'Delivery for order', req.params.orderId);
  }
  return res.json(delivery);
});

router.get('/deliveries/:id', authMiddleware(['superuser', 'admin', 'deliveryops', 'returnhandler', 'cashier']), (req, res) => {
  const delivery = seedDeliveries.find((entry) => entry.id === req.params.id);
  if (!delivery) {
    return notFound(res, 'Delivery', req.params.id);
  }
  return res.json(delivery);
});

router.post('/deliveries', authMiddleware(['superuser', 'admin', 'deliveryops', 'cashier']), (req, res) => {
  const payload = req.body || {};
  const now = new Date().toISOString();
  const delivery = {
    id: buildId('DLV'),
    oid: payload.oid || payload.orderId || '',
    customer: payload.customer || 'Walk-in',
    address: payload.address || '',
    partner: payload.partner || 'Unassigned',
    partnerPhone: payload.partnerPhone || '',
    status: payload.status || 'Pending',
    etaMin: payload.etaMin === undefined ? null : Number(payload.etaMin),
    time: now,
    updatedAt: now,
    companyId: payload.companyId || req.user?.companyId || 'BIZ-101',
  };
  seedDeliveries.push(delivery);
  return res.status(201).json(delivery);
});

router.put('/deliveries/:id', authMiddleware(['superuser', 'admin', 'deliveryops', 'returnhandler']), (req, res) => {
  const delivery = seedDeliveries.find((entry) => entry.id === req.params.id);
  if (!delivery) {
    return notFound(res, 'Delivery', req.params.id);
  }
  Object.assign(delivery, req.body || {}, { id: delivery.id });
  delivery.updatedAt = new Date().toISOString();
  return res.json(delivery);
});

router.delete('/deliveries/:id', authMiddleware(['superuser', 'admin', 'deliveryops']), (req, res) => {
  const index = seedDeliveries.findIndex((entry) => entry.id === req.params.id);
  if (index === -1) {
    return notFound(res, 'Delivery', req.params.id);
  }
  seedDeliveries.splice(index, 1);
  return res.json({ statusCode: 200, message: `Delivery ${req.params.id} deleted` });
});

/* --------------------------------------------------------------------------
   Returns
   -------------------------------------------------------------------------- */
router.get('/returns', authMiddleware(['superuser', 'admin', 'returnhandler', 'cashier']), (req, res) => {
  const scope = pickCompanyScope(req);
  const status = String(req.query.status || '').trim().toLowerCase();
  let returns = scope
    ? seedReturns.filter((entry) => entry.companyId === scope)
    : seedReturns;
  if (status) {
    returns = returns.filter((entry) => String(entry.status || '').toLowerCase().includes(status));
  }
  res.json(returns);
});

router.get('/returns/:id', authMiddleware(['superuser', 'admin', 'returnhandler', 'cashier']), (req, res) => {
  const entry = seedReturns.find((item) => item.id === req.params.id);
  if (!entry) {
    return notFound(res, 'Return', req.params.id);
  }
  return res.json(entry);
});

router.post('/returns', authMiddleware(['superuser', 'admin', 'returnhandler', 'cashier']), (req, res) => {
  const payload = req.body || {};
  const entry = {
    id: buildId('RET'),
    oid: payload.oid || payload.orderId || '',
    reason: payload.reason || payload.product || 'Return requested',
    amount: Number(payload.amount || payload.refundAmount || 0),
    status: payload.status || 'Pending',
    requestedBy: payload.requestedBy || req.user?.name || 'Counter staff',
    updatedAt: new Date().toISOString(),
    companyId: payload.companyId || req.user?.companyId || 'BIZ-101',
  };
  seedReturns.push(entry);
  return res.status(201).json(entry);
});

router.put('/returns/:id', authMiddleware(['superuser', 'admin', 'returnhandler']), (req, res) => {
  const entry = seedReturns.find((item) => item.id === req.params.id);
  if (!entry) {
    return notFound(res, 'Return', req.params.id);
  }
  Object.assign(entry, req.body || {}, { id: entry.id });
  entry.updatedAt = new Date().toISOString();
  return res.json(entry);
});

router.delete('/returns/:id', authMiddleware(['superuser', 'admin', 'returnhandler']), (req, res) => {
  const index = seedReturns.findIndex((item) => item.id === req.params.id);
  if (index === -1) {
    return notFound(res, 'Return', req.params.id);
  }
  seedReturns.splice(index, 1);
  return res.json({ statusCode: 200, message: `Return ${req.params.id} deleted` });
});

module.exports = router;
