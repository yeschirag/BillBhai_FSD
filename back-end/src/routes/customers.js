const express = require('express');
const authMiddleware = require('../middleware/auth');
const service = require('../services/customers.service');
const { asyncHandler } = require('../utils/http');

const router = express.Router();
const ROLES = ['superuser', 'admin', 'cashier', 'customer'];

router.get('/', authMiddleware(ROLES), asyncHandler(async (req, res) => {
  res.json(await service.list(req.user, req.query.companyId));
}));

// Declared before /:id so "phone" is never treated as an id.
router.get('/phone/:phone', authMiddleware(ROLES), asyncHandler(async (req, res) => {
  res.json(await service.getByPhone(req.user, req.params.phone));
}));

router.get('/:id', authMiddleware(ROLES), asyncHandler(async (req, res) => {
  res.json(await service.getById(req.user, req.params.id));
}));

router.post('/', authMiddleware(ROLES), asyncHandler(async (req, res) => {
  const customer = await service.create(req.user, req.body);
  res.status(201).json(customer);
}));

router.put('/:id', authMiddleware(ROLES), asyncHandler(async (req, res) => {
  res.json(await service.update(req.user, req.params.id, req.body));
}));

router.delete('/:id', authMiddleware(['superuser', 'admin']), asyncHandler(async (req, res) => {
  res.json(await service.remove(req.user, req.params.id));
}));

module.exports = router;
