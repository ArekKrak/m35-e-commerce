const db = require('./db');
const express = require('express');
const router = express.Router();

router.post('/:cartId/checkout', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  const cartId = Number(req.params.cartId);
  if (Number.isNaN(cartId)) {
    return res.status(400).json({ error: 'Invalid cart id' });
  }
  const userId = req.user.id;
  const client = await db.connect();
  let started = false;
  try {
    const result = await client.query('SELECT id FROM carts WHERE id = $1 AND user_id = $2', [cartId, userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cart not found' });
    }
    const items = await client.query('SELECT 1 FROM cart_items WHERE cart_id = $1 LIMIT 1', [cartId]);
    if (items.rows.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }
    await client.query('BEGIN');
    started = true;
    const orderRes = await client.query('INSERT INTO orders (cart_id, user_id) VALUES ($1, $2) RETURNING id', [cartId, userId]);
    const orderId = orderRes.rows[0].id;
    await client.query('INSERT INTO order_items (order_id, product_id, quantity) ' + 
    'SELECT $1, product_id, quantity FROM cart_items WHERE cart_id = $2', [orderId, cartId]);
    await client.query('COMMIT');
    started = false;
    return res.status(201).json({ orderId });
  } catch (err) {
    if (started){
      await client.query('ROLLBACK');
    }
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Cart already checked out' });
    }
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
    // finally - so I don't leak connections
  } finally {
    client.release();
  }
});

module.exports = router;
