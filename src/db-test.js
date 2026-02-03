const db = require('./db');

async function test() {
  const res = await db.query('SELECT NOW()');
  console.log(res.rows);
  process.exit(0);
}

test();
