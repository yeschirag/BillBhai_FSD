const express = require('express');
const authMiddleware = require('../middleware/auth');
const service = require('../services/deliveries.service');
const { asyncHandler } = require('../utils/http');

const router = express.Router();
const READ_ROLES = ['superuser', 'admin', 'deliveryops', 'returnhandler', 'cashier'];
const WRITE_ROLES = ['superuser', 'admin', 'deliveryops', 'cashier'];
const UPDATE_ROLES = ['superuser', 'admin', 'deliveryops', 'returnhandler'];

router.get('/', authMiddleware(READ_ROLES), asyncHandler(async (req, res) => {
  res.json(await service.list(req.user, req.query));
}));

router.get('/order/:orderId', authMiddleware(READ_ROLES), asyncHandler(async (req, res) => {
  res.json(await service.getByOrderId(req.user, req.params.orderId));
}));

router.get('/:id', authMiddleware(READ_ROLES), asyncHandler(async (req, res) => {
  res.json(await service.getById(req.user, req.params.id));
}));

router.post('/', authMiddleware(WRITE_ROLES), asyncHandler(async (req, res) => {
  const delivery = await service.create(req.user, req.body);
  res.status(201).json(delivery);
}));

router.put('/:id', authMiddleware(UPDATE_ROLES), asyncHandler(async (req, res) => {
  res.json(await service.update(req.user, req.params.id, req.body));
}));

router.delete('/:id', authMiddleware(['superuser', 'admin', 'deliveryops']), asyncHandler(async (req, res) => {
  res.json(await service.remove(req.user, req.params.id));
}));

module.exports = router;
