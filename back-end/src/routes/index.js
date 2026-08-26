const express = require('express');
const db = require('../db/pool');

const authRoutes = require('./auth');
const companiesRoutes = require('./companies');
const usersRoutes = require('./users');
const customersRoutes = require('./customers');
const productsRoutes = require('./products');
const suppliersRoutes = require('./suppliers');
const inventoryRoutes = require('./inventory');
const ordersRoutes = require('./orders');
const deliveriesRoutes = require('./deliveries');
const returnsRoutes = require('./returns');
const reportsRoutes = require('./reports');

const router = express.Router();

router.get('/health', async (req, res) => {
  let database = 'down';
  try {
    await db.query('SELECT 1');
    database = 'up';
  } catch {
    // Reported as 'down'; the liveness probe still answers.
  }
  res.json({
    status: 'ok',
    application: 'BillBhai Backend',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database,
  });
});

router.use('/auth', authRoutes);
router.use('/companies', companiesRoutes);
router.use('/users', usersRoutes);
router.use('/customers', customersRoutes);
router.use('/products', productsRoutes);
router.use('/suppliers', suppliersRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/orders', ordersRoutes);
router.use('/deliveries', deliveriesRoutes);
router.use('/returns', returnsRoutes);
router.use('/reports', reportsRoutes);

// Kept for backward compatibility with clients that probed this path.
router.get('/', (req, res) => {
  res.json({
    name: 'BillBhai API',
    version: '1.0',
    resources: [
      'auth', 'companies', 'users', 'customers', 'products', 'suppliers',
      'inventory', 'orders', 'deliveries', 'returns', 'reports',
    ],
  });
});

module.exports = router;
