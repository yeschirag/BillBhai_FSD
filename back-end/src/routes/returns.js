const express = require('express');
const authMiddleware = require('../middleware/auth');
const service = require('../services/returns.service');
const { asyncHandler } = require('../utils/http');

const router = express.Router();
const ROLES = ['superuser', 'admin', 'returnhandler', 'cashier'];
const WRITE_ROLES = ['superuser', 'admin', 'returnhandler'];

router.get('/', authMiddleware(ROLES), asyncHandler(async (req, res) => {
  res.json(await service.list(req.user, req.query));
}));

router.get('/:id', authMiddleware(ROLES), asyncHandler(async (req, res) => {
  res.json(await service.getById(req.user, req.params.id));
}));

router.post('/', authMiddleware(ROLES), asyncHandler(async (req, res) => {
  const entry = await service.create(req.user, req.body);
  res.status(201).json(entry);
}));

router.put('/:id', authMiddleware(WRITE_ROLES), asyncHandler(async (req, res) => {
  res.json(await service.update(req.user, req.params.id, req.body));
}));

router.delete('/:id', authMiddleware(WRITE_ROLES), asyncHandler(async (req, res) => {
  res.json(await service.remove(req.user, req.params.id));
}));

module.exports = router;
