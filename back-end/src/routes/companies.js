const express = require('express');
const authMiddleware = require('../middleware/auth');
const service = require('../services/companies.service');
const { asyncHandler } = require('../utils/http');

const router = express.Router();

router.get('/', authMiddleware(['superuser']), asyncHandler(async (req, res) => {
  res.json(await service.list());
}));

router.get('/:id', authMiddleware(['superuser', 'admin']), asyncHandler(async (req, res) => {
  res.json(await service.getById(req.params.id));
}));

router.post('/', authMiddleware(['superuser']), asyncHandler(async (req, res) => {
  const company = await service.create(req.body);
  res.status(201).json(company);
}));

router.put('/:id', authMiddleware(['superuser']), asyncHandler(async (req, res) => {
  res.json(await service.update(req.params.id, req.body));
}));

router.delete('/:id', authMiddleware(['superuser']), asyncHandler(async (req, res) => {
  res.json(await service.remove(req.params.id));
}));

module.exports = router;
