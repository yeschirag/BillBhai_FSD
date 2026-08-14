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

router.get('/', (req, res) => {
  res.redirect('/api');
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

module.exports = router;
