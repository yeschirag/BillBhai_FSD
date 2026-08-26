const express = require('express');
const authMiddleware = require('../middleware/auth');
const service = require('../services/suppliers.service');
const { asyncHandler } = require('../utils/http');

const router = express.Router();
const ROLES = ['superuser', 'admin', 'inventorymanager'];

router.get('/', authMiddleware(ROLES), asyncHandler(async (req, res) => {
  res.json(await service.list());
}));

router.get('/:id', authMiddleware(ROLES), asyncHandler(async (req, res) => {
  res.json(await service.getById(req.params.id));
}));

router.post('/', authMiddleware(ROLES), asyncHandler(async (req, res) => {
  const supplier = await service.create(req.body);
  res.status(201).json(supplier);
}));

router.put('/:id', authMiddleware(ROLES), asyncHandler(async (req, res) => {
  res.json(await service.update(req.params.id, req.body));
}));

router.delete('/:id', authMiddleware(['superuser', 'admin']), asyncHandler(async (req, res) => {
  res.json(await service.remove(req.params.id));
}));

module.exports = router;
