const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../db/pool');
const usersRepo = require('../repositories/users');
const companiesRepo = require('../repositories/companies');
const { HttpError } = require('../utils/http');

const TOKEN_TTL = '8h';
const BCRYPT_ROUNDS = 10;

function str(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

function signToken(user) {
  // Payload shape is part of the frontend contract — do not rename keys.
  return jwt.sign(
    {
      userId: user.id,
      username: user.username,
      role: user.role,
      companyId: user.company_id ?? user.companyId,
      email: user.email,
    },
    config.jwtSecret,
    { expiresIn: TOKEN_TTL },
  );
}

/** Derive a unique login name from an email's local part (snigdha@dibiz.in
 * → snigdha, snigdha2, …). Registration-only convenience; admins created
 * through POST /api/users keep their explicit username. */
async function deriveUsername(client, email) {
  const base = (email.split('@')[0] || 'user').toLowerCase().replace(/[^a-z0-9._-]/g, '') || 'user';
  let candidate = base;
  for (let i = 2; await usersRepo.usernameExists(client, candidate); i += 1) {
    candidate = `${base}${i}`;
  }
  return candidate;
}

async function register(payload = {}) {
  const businessName = str(payload.businessName || payload.name);
  const ownerName = str(payload.ownerName);
  const email = str(payload.email).toLowerCase();
  const phone = str(payload.phone ?? payload.mobileNo);
  const gstin = str(payload.gstNo ?? payload.gstin);
  const businessType = str(payload.businessType ?? payload.type) || 'Retail';
  const address = [
    str(payload.address),
    str(payload.city),
    [str(payload.state), str(payload.pincode)].filter(Boolean).join(' - '),
  ].filter(Boolean).join(', ');
  const password = String(payload.password ?? '');

  if (!businessName) throw new HttpError(400, 'businessName is required', 'Bad Request');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(400, 'A valid email is required', 'Bad Request');
  }
  if (password.length < 6) {
    throw new HttpError(400, 'Password must be at least 6 characters', 'Bad Request');
  }

  const result = await db.withTransaction(async (client) => {
    const clash = await client.query(
      'SELECT 1 FROM users WHERE lower(email) = $1 LIMIT 1',
      [email],
    );
    if (clash.rowCount > 0) {
      throw new HttpError(409, 'An account with this email already exists', 'Conflict');
    }

    const company = await companiesRepo.insert(client, {
      name: businessName,
      owner: ownerName || businessName,
      adminName: ownerName || 'Owner',
      type: businessType,
      email,
      phone,
      gstNo: gstin,
      address,
      status: 'Trial',
      productsPlan: 'Core POS',
      tenureMonths: 0,
      storesCount: 0,
      profit: 0,
      paymentDue: 0,
    });

    const user = await usersRepo.insert(client, {
      companyId: company.id,
      name: ownerName || businessName,
      role: 'admin',
      email,
      mobileNo: phone,
      username: await deriveUsername(client, email),
      passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
      status: 'Active',
    });
    return user;
  });

  const token = signToken(result);
  return {
    id: result.id,
    username: result.username,
    role: result.role,
    email: result.email,
    companyId: result.companyId,
    token,
  };
}

async function login(username, password) {
  if (!username || !password) {
    throw new HttpError(400, 'Username and password are required', 'Bad Request');
  }
  const credentials = await usersRepo.findCredentialsByUsername(db, username);
  if (!credentials || !(await bcrypt.compare(String(password), credentials.password_hash))) {
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

module.exports = { login, register, signToken };
