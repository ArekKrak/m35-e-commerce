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
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:userId', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  const id = Number(req.params.userId);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'User ID must be an integer' });
  }
  if (Number(req.user.id) !== id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const idResult = await db.query('SELECT id, email FROM users WHERE id = $1;', [id]);
    if (idResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json(idResult.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
