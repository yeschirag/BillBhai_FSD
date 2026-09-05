const express = require('express');
const authMiddleware = require('../middleware/auth');
const service = require('../services/products.service');
const { asyncHandler } = require('../utils/http');

const router = express.Router();
const READ_ROLES = ['superuser', 'admin', 'cashier', 'inventorymanager', 'customer'];
const WRITE_ROLES = ['superuser', 'admin', 'inventorymanager'];

router.get('/', authMiddleware(READ_ROLES), asyncHandler(async (req, res) => {
  res.json(await service.list(req.query, req.user));
}));

// Static segments before /:id.
router.get('/categories', authMiddleware(READ_ROLES), asyncHandler(async (req, res) => {
  res.json(await service.categories());
}));

router.get('/barcode/:barcode', authMiddleware(READ_ROLES), asyncHandler(async (req, res) => {
  res.json(await service.getByBarcode(req.params.barcode, req.user));
}));

// Bulk import: valid rows insert in one transaction; bad rows are reported
// per line. Declared before /:id.
router.post('/import', authMiddleware(WRITE_ROLES), asyncHandler(async (req, res) => {
  const result = await service.importCsv(req.user, req.body);
  res.status(201).json(result);
}));

router.get('/:id', authMiddleware(READ_ROLES), asyncHandler(async (req, res) => {
  res.json(await service.getById(req.params.id, req.user));
}));

router.post('/', authMiddleware(WRITE_ROLES), asyncHandler(async (req, res) => {
  const product = await service.create(req.body, req.user);
  res.status(201).json(product);
}));

router.put('/:id', authMiddleware(WRITE_ROLES), asyncHandler(async (req, res) => {
  res.json(await service.update(req.params.id, req.body, req.user));
}));

router.delete('/:id', authMiddleware(['superuser', 'admin']), asyncHandler(async (req, res) => {
  res.json(await service.remove(req.params.id, req.user));
}));

module.exports = router;
