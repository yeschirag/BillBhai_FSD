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

// Split-payment summary: every payment row for the bill plus running totals.
router.get('/payments/bill/:billNo', authMiddleware(BILLING_ROLES), asyncHandler(async (req, res) => {
  res.json(await service.getBillPaymentSummary(req.user, req.params.billNo));
}));

router.get('/payments/:billNo', authMiddleware(BILLING_ROLES), asyncHandler(async (req, res) => {
  res.json(await service.getPaymentByBillNo(req.user, req.params.billNo));
}));

// ── Held bills ──

router.get('/holds', authMiddleware(BILLING_ROLES), asyncHandler(async (req, res) => {
  res.json(await service.listHolds(req.user, req.query));
}));

router.post('/holds', authMiddleware(BILLING_ROLES), asyncHandler(async (req, res) => {
  const hold = await service.createHold(req.user, req.body);
  res.status(201).json(hold);
}));

router.get('/holds/:id', authMiddleware(BILLING_ROLES), asyncHandler(async (req, res) => {
  res.json(await service.getHold(req.user, req.params.id));
}));

router.put('/holds/:id', authMiddleware(BILLING_ROLES), asyncHandler(async (req, res) => {
  res.json(await service.updateHold(req.user, req.params.id, req.body));
}));

router.delete('/holds/:id', authMiddleware(BILLING_ROLES), asyncHandler(async (req, res) => {
  res.json(await service.discardHold(req.user, req.params.id));
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
