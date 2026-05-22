// Apply pass 7: Trauma-informed UX flags as schema column.
// `trauma_sensitive` (boolean) + `trauma_flags` (CSV text) live on clients
// and cases (migration 003). This route is the thin write/read surface so
// the UI can gate content-warning banners, autosave pauses, and pacing
// controls without touching unrelated CRUD code paths.

const express = require('express');
const router = express.Router();
const pool = require('../config/database');

const ALLOWED_TABLES = {
  clients: { idCol: 'client_id' },
  cases:   { idCol: 'case_id' },
};

const KNOWN_FLAGS = [
  'ipv',                  // intimate-partner violence
  'sexual_violence',
  'torture',
  'child_separation',
  'detention_ptsd',
  'lgbtqi_outing_risk',
  'religious_outing_risk',
  'pregnancy',
  'minor_client',
  'self_harm_risk',
  'graphic_imagery',
];

function table(req, res) {
  const t = (req.params.table || '').toLowerCase();
  if (!ALLOWED_TABLES[t]) {
    res.status(400).json({ error: `unsupported resource: ${t}` });
    return null;
  }
  return t;
}

function normalizeFlags(input) {
  if (!input) return '';
  const arr = Array.isArray(input) ? input : String(input).split(',');
  const out = [];
  for (const raw of arr) {
    const v = String(raw || '').trim().toLowerCase();
    if (!v) continue;
    if (KNOWN_FLAGS.includes(v) && !out.includes(v)) out.push(v);
  }
  return out.join(',');
}

// GET /api/trauma-flags/known
router.get('/known', (req, res) => res.json({ known_flags: KNOWN_FLAGS }));

// GET /api/trauma-flags/:table/:resource_id
router.get('/:table/:resource_id', async (req, res) => {
  try {
    const t = table(req, res); if (!t) return;
    const idCol = ALLOWED_TABLES[t].idCol;
    const id = req.params.resource_id;
    const r = await pool.query(
      `SELECT ${idCol} AS resource_id, trauma_sensitive, trauma_flags FROM ${t} WHERE ${idCol} = $1`,
      [id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'resource not found' });
    const row = r.rows[0];
    res.json({
      resource_id: row.resource_id,
      trauma_sensitive: !!row.trauma_sensitive,
      trauma_flags: row.trauma_flags ? row.trauma_flags.split(',').filter(Boolean) : [],
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/trauma-flags/:table/:resource_id
router.put('/:table/:resource_id', async (req, res) => {
  try {
    const t = table(req, res); if (!t) return;
    const idCol = ALLOWED_TABLES[t].idCol;
    const id = req.params.resource_id;
    const { trauma_sensitive, trauma_flags } = req.body || {};
    const flagsCsv = normalizeFlags(trauma_flags);
    const sensitive = trauma_sensitive == null
      ? !!(flagsCsv && flagsCsv.length)
      : !!trauma_sensitive;
    const r = await pool.query(
      `UPDATE ${t} SET trauma_sensitive = $1, trauma_flags = $2, updated_at = NOW()
       WHERE ${idCol} = $3
       RETURNING ${idCol} AS resource_id, trauma_sensitive, trauma_flags`,
      [sensitive, flagsCsv, id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'resource not found' });
    const row = r.rows[0];
    res.json({
      resource_id: row.resource_id,
      trauma_sensitive: !!row.trauma_sensitive,
      trauma_flags: row.trauma_flags ? row.trauma_flags.split(',').filter(Boolean) : [],
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
