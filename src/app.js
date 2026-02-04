const db = require('./db');
const bcrypt = require('bcrypt');
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const app = express();
const PORT = 3000;

// Mental model: Before any route runs, parse incoming JSON and attach it
// to `req.body`.
app.use(express.json());
app.use(session({ secret: 'dev_secret', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy.Strategy(
    { usernameField: 'email' }, async (email, password, done) => {
      try {
        const result = await db.query(
          'SELECT id, email, password_hash FROM users WHERE email = $1', [email]
        );
        const user = result.rows[0];
        if (!user) return done(null, false);
        const ok = await bcrypt.compare(password, user.password_hash);
        if (!ok) return done(null, false);
      
        return done(null, { id: user.id, email: user.email });
      } catch (err) {
        return done(err);
      }
    }
  )
);
// serializeUser: store only the user id
passport.serializeUser((user, done) => {
  done(null, user.id);
});
// deserializeUser: load user by id from DB
passport.deserializeUser(async (id, done) => {
  try {
    const result = await db.query('SELECT id, email FROM users WHERE id = $1', [id]);
    const user = result.rows[0];
    if (!user) return done(null, false);
    return done(null, user);
  } catch (err) {
    return done(err);
  }
});

app.post('/login', passport.authenticate('local'), (req, res) => {
  res.json({ id: req.user.id, email: req.user.email });
});

app.get('/', (req, res) => {
  res.send('Server running.')
});
app.get('/me', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'not logged in' })
  return res.json(req.user);
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

