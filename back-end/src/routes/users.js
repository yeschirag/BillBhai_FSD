const express = require('express');
const authMiddleware = require('../middleware/auth');
const service = require('../services/users.service');
const { asyncHandler } = require('../utils/http');

const router = express.Router();
const READ_ROLES = ['superuser', 'admin'];
const WRITE_ROLES = ['superuser', 'admin'];

router.get('/', authMiddleware(READ_ROLES), asyncHandler(async (req, res) => {
  res.json(await service.list(req.user, req.query.companyId));
}));

router.get('/:id', authMiddleware(READ_ROLES), asyncHandler(async (req, res) => {
  res.json(await service.getById(req.user, req.params.id));
}));

router.post('/', authMiddleware(WRITE_ROLES), asyncHandler(async (req, res) => {
  const user = await service.create(req.user, req.body);
  res.status(201).json(user);
}));

router.put('/:id', authMiddleware(WRITE_ROLES), asyncHandler(async (req, res) => {
  res.json(await service.update(req.user, req.params.id, req.body));
}));

router.delete('/:id', authMiddleware(WRITE_ROLES), asyncHandler(async (req, res) => {
  res.json(await service.remove(req.user, req.params.id));
}));

module.exports = router;
