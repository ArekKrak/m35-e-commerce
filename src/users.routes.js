const db = require('./db');
const bcrypt = require('bcrypt');
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

router.put('/:userId', async (req, res) => {
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
  const { email, password } = req.body;
  if (email === undefined && password === undefined) {
    return res.status(400).json({ error: 'Resource missing' });
  }
  if (email !== undefined && password !== undefined) {
    if (typeof email !== 'string' || email.trim() === '' || typeof password !== 'string' || password.trim() === '') {
      return res.status(400).json({ error: 'Resource(s) missing' });
    }
    try {
      const newHash = await bcrypt.hash(password, 10);
      const updated = await db.query('UPDATE users SET email = $1, password_hash = $2 WHERE id = $3 RETURNING id, email', [email.trim(), newHash, id]);
      if (updated.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      return res.json(updated.rows[0]);
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ error: 'Email already in use' });
      }
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  if (email !== undefined) {
    if (typeof email !== 'string' || email.trim() === '') {
      return res.status(400).json({ error: 'Email must be a non-empty string' });
    }
    try {
      const updated = await db.query('UPDATE users SET email = $1 WHERE id = $2 RETURNING id, email', [email.trim(), id]);
      if (updated.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      return res.json(updated.rows[0]);
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ error: 'Email already in use' });
      }
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  if (typeof password !== 'string' || password.trim() === '') {
    return res.status(400).json({ error: 'Password must not be empty' });
  }
  try {
    const newHash = await bcrypt.hash(password, 10);
    const updated = await db.query('UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING id, email', [newHash, id]);
    if (updated.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json(updated.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
