const express = require('express');
const authMiddleware = require('../middleware/auth');
const service = require('../services/inventory.service');
const { asyncHandler } = require('../utils/http');

const router = express.Router();
const ROLES = ['superuser', 'admin', 'inventorymanager', 'cashier'];
const WRITE_ROLES = ['superuser', 'admin', 'inventorymanager'];

router.get('/', authMiddleware(ROLES), asyncHandler(async (req, res) => {
  res.json(await service.list(req.user, req.query.companyId));
}));

// Static segments before /:id.
router.get('/low-stock', authMiddleware(ROLES), asyncHandler(async (req, res) => {
  res.json(await service.lowStock(req.user, req.query.companyId));
}));

router.get('/product/:productId', authMiddleware(ROLES), asyncHandler(async (req, res) => {
  res.json(await service.getByProduct(req.user, req.params.productId));
}));

router.post('/adjust', authMiddleware(WRITE_ROLES), asyncHandler(async (req, res) => {
  res.json(await service.adjust(req.user, req.body));
}));

router.get('/:id', authMiddleware(ROLES), asyncHandler(async (req, res) => {
  res.json(await service.getById(req.user, req.params.id));
}));

router.put('/:id', authMiddleware(WRITE_ROLES), asyncHandler(async (req, res) => {
  res.json(await service.update(req.user, req.params.id, req.body));
}));

module.exports = router;
