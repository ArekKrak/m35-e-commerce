const { Pool } = require('pg');
const pool = new Pool({
  user: 'arek',
  host: 'localhost',
  database: 'ecommerce_api',
  password: 'password',
  port: 5432
});

async function run() {
  const result = await pool.query('SELECT NOW()');
  console.log(result.rows);
  await pool.end();
}

run();
