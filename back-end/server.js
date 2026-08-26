/* eslint-disable no-console */

const app = require('./src/app');
const config = require('./src/config');
const db = require('./src/db/pool');

const port = config.port;
const host = config.host;

async function main() {
  // Fail fast (and clearly) when PostgreSQL is unreachable: the API is
  // useless without it, so crash-looping beats serving 500s silently.
  try {
    const now = await db.checkConnection();
    console.log(`[db] connected to PostgreSQL (server time ${now.toISOString()})`);
  } catch (err) {
    console.error('[db] FATAL: cannot reach PostgreSQL.');
    console.error('[db] Check DATABASE_URL in back-end/.env and that PostgreSQL is running.');
    console.error(`[db] Underlying error: ${err.message}`);
    process.exit(1);
  }

  const server = app.listen(port, host, () => {
    console.log(`BillBhai Express backend running on http://${host}:${port}`);
    console.log(`API: http://${host}:${port}/api`);
    console.log(`Health check: http://${host}:${port}/api/health`);
  });

  const shutdown = async (signal) => {
    console.log(`\n[shutdown] ${signal} received, closing gracefully…`);
    server.close(async () => {
      try {
        await db.close();
        console.log('[shutdown] HTTP server and DB pool closed');
      } finally {
        process.exit(0);
      }
    });
    // Hard stop if connections refuse to drain.
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('[boot] Unexpected startup failure:', err);
  process.exit(1);
});
