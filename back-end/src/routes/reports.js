const express = require('express');
const authMiddleware = require('../middleware/auth');
const service = require('../services/reports.service');
const { asyncHandler } = require('../utils/http');

const router = express.Router();

// Business analytics are management-only.
router.get('/sales', authMiddleware(['superuser', 'admin']), asyncHandler(async (req, res) => {
  res.json(await service.salesSummary(req.user, req.query));
}));

router.get('/inventory', authMiddleware(['superuser', 'admin', 'inventorymanager']), asyncHandler(async (req, res) => {
  res.json(await service.inventoryStatus(req.user, req.query));
}));

router.get('/returns', authMiddleware(['superuser', 'admin', 'returnhandler']), asyncHandler(async (req, res) => {
  res.json(await service.returnsSummary(req.user, req.query));
}));

router.get('/top-products', authMiddleware(['superuser', 'admin']), asyncHandler(async (req, res) => {
  res.json(await service.topProducts(req.user, req.query));
}));

module.exports = router;
