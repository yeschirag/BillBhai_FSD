const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const env = process.env;

const config = {
  nodeEnv: env.NODE_ENV || 'development',
  port: Number(env.PORT || 3000),
  host: env.HOST || '0.0.0.0',
  databaseUrl: env.DATABASE_URL || '',
  jwtSecret: env.JWT_SECRET || 'billbhai-super-secret-key-change-in-production',
  // Pool sizing: small on purpose — the Express app is the only consumer.
  dbPoolMax: Number(env.DB_POOL_MAX || 10),
  dbSsl: String(env.PGSSL || '').toLowerCase() === 'require',
};

if (!config.databaseUrl) {
  throw new Error(
    'DATABASE_URL is not set. Copy back-end/.env.example to back-end/.env and point it at your PostgreSQL instance.',
  );
}

if (config.nodeEnv === 'production' && config.jwtSecret.startsWith('billbhai-super-secret')) {
  console.warn('[CONFIG] WARNING: JWT_SECRET is still the development default. Set a real secret in production.');
}

module.exports = config;
