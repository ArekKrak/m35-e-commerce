const { Pool } = require('pg');
const pool = new Pool({
  user: 'arek',
  host: 'localhost',
  database: 'ecommerce_api',
  password: 'password',
  port: 5432
});

function query(text, params) {
  return pool.query(text, params);
}

module.exports = { query };
