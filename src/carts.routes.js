const db = require('./db');
const express = require('express');
const router = express.Router();

/**
 * @openapi
 * /carts/{cartId}/checkout:
 *   post:
 *     summary: Checkout a cart (creates an order and copies cart items)
 *     tags: [Carts]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: cartId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       201:
 *         description: Order created
 *       400:
 *         description: Invalid cart ID or cart is empty
 *       401:
 *         description: Not logged in
 *       404:
 *         description: Cart not found
 *       409:
 *         description: Cart already checked out
 *       500:
 *         description: Internal server error
 */

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

/**
 * @openapi
 * /carts/{cartId}:
 *   post:
 *     summary: Add or update a product in a cart (UPSERT quantity)
 *     tags: [Carts]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: cartId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               productId:
 *                 type: integer
 *               quantity:
 *                 type: integer
 *             required: [productId, quantity]
 *     responses:
 *       200:
 *         description: Item stored (cart_id, product_id, quantity)
 *       400:
 *         description: Invalid input (cart ID, product ID, or quantity)
 *       401:
 *         description: Not logged in
 *       404:
 *         description: Cart not found or product not found
 *       500:
 *         description: Internal server error
 */

router.post('/:cartId', async (req, res) => {
  // Cart belongs to a user, so auth is mandatory
  if (!req.user) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  // Parse cartId - params are strings. DB expects an integer
  const cartId = Number(req.params.cartId);
  if (Number.isNaN(cartId)) {
    return res.status(400).json({ error: 'Invalid cart ID' });
  }
  const { productId, quantity } = req.body || {};
  const pid = Number(productId);
  const qty = Number(quantity);
  // Validation: both `productId` and `quantity` must be a real positive integer
  if (!Number.isInteger(pid) || pid <= 0) {
    return res.status(400).json({ error: 'Invalid product ID' });
  }
  if (!Number.isInteger(qty) || qty <= 0) {
    return res.status(400).json({ error: 'Invalid quantity' });
  }
  try {
    // Ownership check - the query checks both at once correct cart ID and owned by current user
    const cart = await db.query('SELECT id FROM carts WHERE id = $1 AND user_id = $2', [cartId, req.user.id]);
    if (cart.rows.length === 0) {
      return res.status(404).json({ error: 'Cart not found' });
    }
    // Product existence check - this is about returning a friendly, clear API response.
    const product = await db.query('SELECT id FROM products WHERE id = $1', [pid]);
    if (product.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    // UPSERT: UPdate + inSERT - one query does the whole job
    // EXCLUDED.quantity means that it's the quantity from the attempted insert
    const item = await db.query('INSERT INTO cart_items (cart_id, product_id, quantity) VALUES ($1, $2, $3) ' +
    'ON CONFLICT (cart_id, product_id) DO UPDATE SET quantity = EXCLUDED.quantity ' +
    'RETURNING cart_id, product_id, quantity', [cartId, pid, qty]
    );
    // Return the result to confirm what the server stored (source of truth), not what the client hoped it stored
    return res.json(item.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @openapi
 * /carts:
 *   post:
 *     summary: Create a new cart for the logged-in user
 *     tags: [Carts]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       201:
 *         description: Cart created
 *       401:
 *         description: Not logged in
 *       500:
 *         description: Internal server error
 */

router.post('/', async (req, res) => {
  // Auth guard
  if (!req.user) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  // Databases calls can fail (DB down, typo, etc.). `try/catch` turns that into a controlled API response
  try {
    // Source of truth for "who is creating this cart"
    const userId = req.user.id;
    // `INSERT INTO carts (user_id)` creates a cart header; `$1` is a placeholder which prevents SQL injection
    const result = await db.query('INSERT INTO carts (user_id) VALUES ($1) RETURNING id, user_id', [userId]);
    return res.status(201).json(result.rows[0]); // `result.rows[0]` contains the returned `id` and `user_id`
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @openapi
 * /carts/{cartId}:
 *   get:
 *     summary: Get a cart (only if it belongs to the logged-in user)
 *     tags: [Carts]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: cartId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Numeric cart id
 *     responses:
 *       200:
 *         description: Cart detail (header + items)
 *       400:
 *         description: Invalid cart ID
 *       401:
 *         description: Not logged in
 *       404:
 *         description: Cart not found
 *       500:
 *         description: Internal server error
 */

router.get('/:cartId', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  // Parse cartId
  const cartId = Number(req.params.cartId);
  if (Number.isNaN(cartId)) {
    return res.status(400).json({ error: 'Invalid cart ID' });
  }
  // `try/catch` block for a controlled API response
  try {
    // Source of truth
    const userId = req.user.id;
    const cart = await db.query('SELECT id, user_id FROM carts WHERE id = $1 AND user_id = $2', [cartId, userId]);
    if (cart.rows.length === 0) {
      return res.status(404).json({ error: 'Cart not found' });
    }
    // Fetch cart line items
    const items = await db.query('SELECT product_id, quantity FROM cart_items WHERE cart_id = $1 ORDER BY product_id', [cartId]);
    // Return a client-friendly response shape; `items` is a simple list that the frontend can display
    return res.json({
      id: cart.rows[0].id,
      userId: cart.rows[0].user_id,
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
