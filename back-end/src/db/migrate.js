#!/usr/bin/env node
/* eslint-disable no-console */

// Applies SQL migrations from src/db/migrations in filename order.
// Each migration runs exactly once, inside its own transaction; a
// pg_advisory_lock keeps concurrent runners (dev server + tests) serialized.

const fs = require('fs');
const path = require('path');
const config = require('../config');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function runMigrations(pgClientFactory) {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort();

  const client = await pgClientFactory();
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      id         text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`);

    const applied = new Set(
      (await client.query('SELECT id FROM schema_migrations')).rows.map((row) => row.id),
    );

    // Serialize concurrent migration runs.
    await client.query('SELECT pg_advisory_lock(727101)');

    for (const file of files) {
      if (applied.has(file)) {
        continue;
      }
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`[migrate] applied ${file}`);
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw new Error(`Migration ${file} failed: ${err.message}`);
      }
    }

    console.log(`[migrate] done (${files.length} migration file(s), schema up to date)`);
  } finally {
    await client.query('SELECT pg_advisory_unlock(727101)').catch(() => {});
    // Works for both pooled clients (.release) and standalone Clients (.end).
    if (typeof client.release === 'function') {
      client.release();
    } else {
      await client.end().catch(() => {});
    }
  }
}

function connectDirect() {
  // Bypass the app pool: migrations must also work before the pool exists.
  const { Client } = require('pg');
  return new Promise((resolve, reject) => {
    const client = new Client({ connectionString: config.databaseUrl });
    client.connect().then(() => resolve(client)).catch(reject);
  });
}

if (require.main === module) {
  runMigrations(connectDirect)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[migrate] FAILED:', err.message);
      process.exit(1);
    });
}

module.exports = { runMigrations };
