const express = require('express');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/auth');
const { seedUsers, seedProducts, seedOrders } = require('../data/seed-data');

const router = express.Router();

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

module.exports = router;
