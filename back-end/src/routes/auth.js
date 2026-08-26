const express = require('express');
const authService = require('../services/auth.service');
const { asyncHandler } = require('../utils/http');

const router = express.Router();

router.post('/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body || {};
  const result = await authService.login(username, password);
  return res.json(result);
}));

// Self-serve business signup: creates the company and its admin user in one
// transaction, then returns the same shape as /login so callers can
// auto-sign-in. Response status 201 (created).
router.post('/register', asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  return res.status(201).json(result);
}));

module.exports = router;
