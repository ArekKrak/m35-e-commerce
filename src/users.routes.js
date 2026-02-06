const db = require('./db');
const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  try {
    const result = await db.query('SELECT id, email FROM users ORDER BY id');
    return res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal server error' });
  }
});

module.exports = router;
