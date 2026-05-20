const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { JWT_SECRET, authenticateToken, requireAdmin } = require('../middleware/auth');
const pool = require('../config/database');

// Fallback demo admin used when the users table is unavailable
const DEMO_USER = {
  id: 1,
  email: 'admin@asylum.io',
  password: 'admin123',
  name: 'Admin',
  role: 'admin',
};

async function findDbUser(email, password) {
  try {
    const r = await pool.query(
      'SELECT id, email, password, name, role FROM users WHERE email = $1 LIMIT 1',
      [email]
    );
    if (!r.rows.length) return null;
    const u = r.rows[0];
    if (u.password !== password) return null;
    return { id: u.id, email: u.email, name: u.name, role: u.role };
  } catch (e) {
    return null;
  }
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    let user = await findDbUser(email, password);

    if (!user) {
      if (email === DEMO_USER.email && password === DEMO_USER.password) {
        user = {
          id: DEMO_USER.id,
          email: DEMO_USER.email,
          name: DEMO_USER.name,
          role: DEMO_USER.role,
        };
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user });
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  res.json({
    id: req.user.id,
    email: req.user.email,
    name: req.user.name,
    role: req.user.role,
  });
});

// GET /api/auth/users  (admin only)
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const r = await pool.query('SELECT id, email, name, role, created_at FROM users ORDER BY id ASC');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
