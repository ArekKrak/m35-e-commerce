const db = require('./db');
const express = require('express');
const router = express.Router();

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
});

module.exports = router;
