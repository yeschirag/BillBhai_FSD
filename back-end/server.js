const app = require('./src/app');

const port = process.env.PORT || 3000;
const host = process.env.HOST || '0.0.0.0';

app.listen(port, host, () => {
  console.log(`BillBhai Express backend running on http://${host}:${port}`);
  console.log(`API: http://${host}:${port}/api`);
  console.log(`Health check: http://${host}:${port}/api/health`);
});
