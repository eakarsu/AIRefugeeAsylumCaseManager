const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { requireWriter } = require('../middleware/auth');

// GET /api/notifications      → all notifications for current user (most recent first)
// GET /api/notifications/unread → unread count + rows
router.get('/', async (req, res) => {
  try {
    const uid = req.user?.id;
    const r = await pool.query(
      `SELECT * FROM notifications
        WHERE user_id IS NULL OR user_id = $1
        ORDER BY created_at DESC LIMIT 100`,
      [uid]
    );
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/unread', async (req, res) => {
  try {
    const uid = req.user?.id;
    const r = await pool.query(
      `SELECT * FROM notifications
        WHERE (user_id IS NULL OR user_id = $1) AND read_at IS NULL
        ORDER BY created_at DESC LIMIT 100`,
      [uid]
    );
    res.json({ count: r.rows.length, rows: r.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', requireWriter, async (req, res) => {
  try {
    const { user_id, title, body, severity, source } = req.body || {};
    const r = await pool.query(
      `INSERT INTO notifications (user_id,title,body,severity,source) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [user_id ?? null, title || '', body || '', severity || 'info', source || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/:id/read', async (req, res) => {
  try {
    const r = await pool.query(
      `UPDATE notifications SET read_at = NOW() WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'not found' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/mark-all-read', async (req, res) => {
  try {
    const uid = req.user?.id;
    await pool.query(
      `UPDATE notifications SET read_at = NOW()
        WHERE (user_id IS NULL OR user_id = $1) AND read_at IS NULL`,
      [uid]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
