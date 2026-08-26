const { Pool } = require('pg');
const config = require('../config');

// Single pooled client for the whole process. Never create a Pool per request.
const pool = new Pool({
  connectionString: config.databaseUrl,
  max: config.dbPoolMax,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: config.dbSsl ? { rejectUnauthorized: false } : undefined,
});

pool.on('error', (err) => {
  console.error('[DB] Idle client error:', err.message);
});

/**
 * Run a single parameterized query. All user-controlled values must go
 * through $1..$n placeholders — never string-concatenated SQL.
 */
async function query(text, params = []) {
  return pool.query(text, params);
}

/**
 * Run `fn` inside a transaction. The callback receives a client whose
 * query() is bound to the same transaction. Rolls back on throw.
 *
 *   await withTransaction(async (tx) => {
 *     const order = await tx.query('INSERT INTO orders ... RETURNING *', [...]);
 *     ...
 *   });
 */
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const tx = {
      query: (text, params) => client.query(text, params),
    };
    const result = await fn(tx);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error('[DB] Rollback failed:', rollbackErr.message);
    }
    throw err;
  } finally {
    client.release();
  }
}

/** Verify connectivity at startup; fail loudly when the DB is required. */
async function checkConnection() {
  const result = await pool.query('SELECT now() AS now');
  return result.rows[0].now;
}

async function close() {
  await pool.end();
}

module.exports = { pool, query, withTransaction, checkConnection, close };
