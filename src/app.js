const db = require('./db.js');
const bcrypt = require('bcrypt');
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const app = express();
const PORT = 3000;

// Mental model: Before any route runs, parse incoming JSON and attach it
// to `req.body`.
app.use(express.json());
app.use(session({ secret: 'dev_secret', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

app.get('/', (req, res) => {
  res.send('Server running.')
});

// Prove the route exists and receives data using /register handler
app.post('/register', async (req, res) => {
  // Validate input
  // 1. Extract fields
  const { email, password } = req.body || {};
  
  // 2. If missing, return 400 with a JSON error
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  // try block to throw a clean API response should the same email be registered
  // twice.
  try {
    const result = await db.query(
      // SQL query, $1, $2 are placeholders to prevent SQL injections
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [email, passwordHash]
    );
    // status 201 (created)
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    // `23505` is Postgres's error for unique constrant violation
    if (err.code === '23505') {
      // 409 - Conflict error
      return res.status(409).json({ error: 'user already exists' });
    }
    console.error(err);
    // 500 - Internal Server Error
    return res.status(500).json({ error: 'internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

