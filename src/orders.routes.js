const db = require('./db');
const express = require('express');
const router = express.Router();

/**
 * @openapi
 * /orders:
 *   get:
 *     summary: List orders for the logged-in user
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Array of orders (id + created_at)
 *       401:
 *         description: Not logged in
 */

// Meaning: "Show me all orders I (the logged-in user) have placed"
router.get('/', async (req, res) => {
  // Auth guard
  if (!req.user) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  try {
    const userId = req.user.id;
    const result = await db.query('SELECT id, created_at FROM orders WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
})

/**
 * @openapi
 * /orders/{orderId}:
 *   get:
 *     summary: Get a single order (only if it belongs to the logged-in user)
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Numeric order id
 *     responses:
 *       200:
 *         description: Order detail (header + items)
 *       400:
 *         description: Invalid order ID
 *       401:
 *         description: Not logged in
 *       404:
 *         description: Order not found
 */

// Meaning: "Show me one specific order, but only if it's mine"
router.get('/:orderId', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  const orderId = Number(req.params.orderId);
  if (Number.isNaN(orderId)) {
    return res.status(400).json({ error: 'Invalid order ID' });
  }
  try {
    // This prevents a user from reading someone else's order by guessing ids
    const userId = req.user.id;
    const order = await db.query('SELECT id, created_at FROM orders WHERE id = $1 AND user_id = $2', [orderId, userId]);
    if (order.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const items = await db.query('SELECT product_id, quantity FROM order_items WHERE order_id = $1 ORDER BY product_id', [orderId]);
    return res.json({
      id: order.rows[0].id,
      createdAt: order.rows[0].created_at,
      items: items.rows.map(r => ({
        productId: r.product_id,
        quantity: r.quantity
      }))
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
