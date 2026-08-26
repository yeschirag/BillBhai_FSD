const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../db/pool');
const usersRepo = require('../repositories/users');
const { HttpError } = require('../utils/http');

const TOKEN_TTL = '8h';

function signToken(user) {
  // Payload shape is part of the frontend contract — do not rename keys.
  return jwt.sign(
    {
      userId: user.id,
      username: user.username,
      role: user.role,
      companyId: user.company_id,
      email: user.email,
    },
    config.jwtSecret,
    { expiresIn: TOKEN_TTL },
  );
}

async function login(username, password) {
  if (!username || !password) {
    throw new HttpError(400, 'Username and password are required', 'Bad Request');
  }
  const credentials = await usersRepo.findCredentialsByUsername(db, username);
  if (!credentials || !bcrypt.compareSync(String(password), credentials.password_hash)) {
    throw new HttpError(401, 'Invalid username or password', 'Unauthorized');
  }
  if (credentials.status && credentials.status !== 'Active') {
    throw new HttpError(403, `Account is ${credentials.status}`, 'Forbidden');
  }
  const token = signToken(credentials);
  return {
    id: credentials.id,
    username: credentials.username,
    role: credentials.role,
    email: credentials.email,
    companyId: credentials.company_id,
    token,
  };
}

module.exports = { login, signToken };
