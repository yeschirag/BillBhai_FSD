const app = require('./src/app');

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`BillBhai Express backend running on http://localhost:${port}`);
  console.log(`API: http://localhost:${port}/api`);
});
