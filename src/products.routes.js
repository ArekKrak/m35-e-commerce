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
    const filteredResult = await db.query('SELECT id, name, price, category_id FROM products WHERE category_id = $1 ORDER BY id', [categoryId]);
    return res.json(filteredResult.rows);
  }
  const result = await db.query('SELECT id, name, price, category_id FROM products ORDER BY id');
  return res.json(result.rows);
});

router.get('/:productId', async (req, res) => {
  const id = Number(req.params.productId);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Product id must be an integer' });
  }
  const idResult = await db.query ('SELECT id, name, price, category_id FROM products WHERE id = $1', [id]);
  if (idResult.rows.length === 0) {
    return res.status(404).json({ error: 'Product not found' });
  } else {
    return res.json(idResult.rows[0]);
  }
});

router.post('/', async (req, res) => {
  const { name, price, category_id } = req.body;
  if (!name || price === undefined) {
    return res.status(400).json({ error: 'Resource missing' });
  }
  const priceInt = Number(price);
  if (!Number.isInteger(priceInt) || priceInt < 0) {
    return res.status(400).json({ error: 'Price must be an integer' });
  }
  let categoryIdInt = null;
  if (category_id !== undefined && category_id !== null) {
    categoryIdInt = Number(category_id);
    if (!Number.isInteger(categoryIdInt)) {
      return res.status(400).json({ error: 'Category ID must be an integer' });
    }
  }
  try {
    const result = await db.query('INSERT INTO products (name, price, category_id) VALUES ($1, $2, $3) RETURNING id, name, price, category_id', [name, priceInt, categoryIdInt]);
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23503') {
      return res.status(400).json({ error: 'invalid category_id' });
    }
    console.error(err);
    return res.status(500).json({ error: 'internal server error' });
  }
});

module.exports = router;
