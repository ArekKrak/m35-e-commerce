const express = require('express');
const app = express();
const PORT = 3000;

// Mental model: Before any route runs, parse incoming JSON and attach it
// to `req.body`.
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Server running.')
});

// Prove the route exists and receives data
app.post('/register', (req, res) => {
  // Validate input
  // 1. Extract fields
  const { email, password } = req.body || {};
  
  // 2. If missing, return 400 with a JSON error
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }
  // 3. Otherwise, return 200
  return res.status(200).json({ email });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
