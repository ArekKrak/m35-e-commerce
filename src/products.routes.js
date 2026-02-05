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
      return res.status(400).json({ error: 'Category must be an integer ID' });
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
    return res.status(400).json({ error: 'Product ID must be an integer' });
  }
  const idResult = await db.query('SELECT id, name, price, category_id FROM products WHERE id = $1', [id]);
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
router.put('/:productId', async (req, res) => {
  const { productId } = req.params;
  const productIdInt = Number(productId);
  if (!Number.isInteger(productIdInt)) {
    return res.status(400).json({ error: 'Product ID must be an integer' });
  }
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
  let update;
  try {
    update = await db.query('UPDATE products SET name = $1, price = $2, category_id = $3 WHERE id = $4 RETURNING id, name, price, category_id', [name, priceInt, categoryIdInt, productIdInt]);
  } catch (err) {
    if (err.code === '23503') {
      return res.status(400).json({ error: 'invalid category_id' });
    }
    console.error(err);
    return res.status(500).json({ error: 'internal server error' });
  }
  if (update.rows.length === 0) {
    return res.status(404).json({ error: 'Not found' });
  } else {
    return res.json(update.rows[0]);
  }
});

router.delete('/:productId', async (req, res) => {
  const id = Number(req.params.productId);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Product ID must be an integer' });
  }
  const idResult = await db.query('DELETE FROM products WHERE id = $1 RETURNING id;', [id]);
  if (idResult.rows.length === 0) {
    return res.status(404).json({ error: 'Product not found' });
  } else {
    return res.sendStatus(204);
  }
});

module.exports = router;

// TEST SUITE

// Create: $ curl -i -X POST http://localhost:3000/products -H "Content-Type: application/json" -d '{"name":"LoopTest","price":111}' ; echo
// List: $ curl -i http://localhost:3000/products ; echo
// Get one: $ curl -i http://localhost:3000/products/1 ; echo
// Update: $ curl -i -X PUT http://localhost:3000/products/1 -H "Content-Type: application/json" -d '{"name":"LoopTestUpdated","price":222,"category_id":null}' ; echo
// Delete: $ curl -i -X DELETE http://localhost:3000/products/1 ; echo

