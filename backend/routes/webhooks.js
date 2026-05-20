const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { requireCommander } = require('../middleware/auth');
const { fireWebhook } = require('../services/webhooks');

router.get('/', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM webhooks ORDER BY id DESC');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', requireCommander, async (req, res) => {
  try {
    const { name, url, secret, events, active } = req.body || {};
    if (!url) return res.status(400).json({ error: 'url is required' });
    const r = await pool.query(
      `INSERT INTO webhooks (name,url,secret,events,active) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [name || null, url, secret || '', events || '', active !== false]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', requireCommander, async (req, res) => {
  try {
    const { name, url, secret, events, active } = req.body || {};
    const r = await pool.query(
      `UPDATE webhooks SET name = $1, url = $2, secret = $3, events = $4, active = $5, updated_at = NOW()
       WHERE id = $6 RETURNING *`,
      [name ?? null, url ?? '', secret ?? '', events ?? '', active !== false, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'not found' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', requireCommander, async (req, res) => {
  try {
    const r = await pool.query('DELETE FROM webhooks WHERE id = $1 RETURNING *', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'not found' });
    res.json({ message: 'deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/webhooks/test  { event, payload? }
router.post('/test', requireCommander, async (req, res) => {
  try {
    const { event, payload } = req.body || {};
    const evt = event || 'test.ping';
    const r = await fireWebhook(evt, payload || { hello: 'world', at: new Date().toISOString() });
    res.json(r);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/webhooks/:id/deliveries
router.get('/:id/deliveries', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT * FROM webhook_deliveries WHERE webhook_id = $1
       ORDER BY attempted_at DESC LIMIT 100`,
      [req.params.id]
    );
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
