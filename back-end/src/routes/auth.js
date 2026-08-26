const express = require('express');
const authService = require('../services/auth.service');
const { asyncHandler } = require('../utils/http');

const router = express.Router();

router.post('/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body || {};
  const result = await authService.login(username, password);
  return res.json(result);
}));

module.exports = router;
