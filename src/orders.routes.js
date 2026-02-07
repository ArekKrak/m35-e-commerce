const db = require('./db');
const express = require('express');
const router = express.Router();

// Meaning: "Show me all orders I (the logged-in user) have placed"
router.get('/', async (req, res) => {
  
});

module.exports = router;
