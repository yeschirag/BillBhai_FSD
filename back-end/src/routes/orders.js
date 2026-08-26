const express = require('express');
const authMiddleware = require('../middleware/auth');
const service = require('../services/orders.service');
const { asyncHandler } = require('../utils/http');

const router = express.Router();
const READ_ROLES = ['superuser', 'admin', 'cashier', 'returnhandler', 'deliveryops'];
const WRITE_ROLES = ['superuser', 'admin', 'cashier'];
// Bills and payments move money — handlers only.
const BILLING_ROLES = ['superuser', 'admin', 'cashier'];

router.get('/', authMiddleware(READ_ROLES), asyncHandler(async (req, res) => {
  res.json(await service.list(req.user, req.query));
}));

// Static segments before /:id.
router.get('/bills/all', authMiddleware(BILLING_ROLES), asyncHandler(async (req, res) => {
  res.json(await service.listBills(req.user, req.query));
}));

router.get('/bills/:billNo', authMiddleware(BILLING_ROLES), asyncHandler(async (req, res) => {
  res.json(await service.getBillByNo(req.user, req.params.billNo));
}));

router.post('/bills', authMiddleware(BILLING_ROLES), asyncHandler(async (req, res) => {
  const bill = await service.createBill(req.user, req.body);
  res.status(201).json(bill);
}));

router.get('/payments/all', authMiddleware(BILLING_ROLES), asyncHandler(async (req, res) => {
  res.json(await service.listPayments(req.user, req.query));
}));

router.get('/payments/:billNo', authMiddleware(BILLING_ROLES), asyncHandler(async (req, res) => {
  res.json(await service.getPaymentByBillNo(req.user, req.params.billNo));
}));

router.post('/payments', authMiddleware(BILLING_ROLES), asyncHandler(async (req, res) => {
  const payment = await service.createPayment(req.user, req.body);
  res.status(201).json(payment);
}));

router.get('/:id', authMiddleware(READ_ROLES), asyncHandler(async (req, res) => {
  res.json(await service.getById(req.user, req.params.id));
}));

router.post('/', authMiddleware(WRITE_ROLES), asyncHandler(async (req, res) => {
  const order = await service.create(req.user, req.body);
  res.status(201).json(order);
}));

router.put('/:id', authMiddleware(WRITE_ROLES), asyncHandler(async (req, res) => {
  res.json(await service.update(req.user, req.params.id, req.body));
}));

router.delete('/:id', authMiddleware(['superuser', 'admin']), asyncHandler(async (req, res) => {
  res.json(await service.remove(req.user, req.params.id));
}));

module.exports = router;
