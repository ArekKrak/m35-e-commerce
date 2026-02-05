const db = require('./db');
const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  const { category } = req.query;
  // dummy JSON test line
  // res.json({ ok: true, route: 'GET /products' });
  if (category !== undefined) {
    const categoryId = Number(category);
    if (!Number.isInteger(categoryId)) {
      return res.status(400).json({ error: 'Category must be an integer id' });
    }
    const filteredResult = await db.query('SELECT * FROM products WHERE category_id = $1 ORDER BY id', [categoryId]);
    return res.json(filteredResult.rows);
  } else {
    const result = await db.query('SELECT * FROM products ORDER BY id');
    return res.json(result.rows);
  }
});

module.exports = router;
