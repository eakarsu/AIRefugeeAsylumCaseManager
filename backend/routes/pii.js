// Apply pass 7: PII encryption-at-rest endpoints.
// Sealed-envelope CRUD on the `pii_encrypted` column added in migration 003
// for `clients` and `cases`. Never touches plaintext columns.

const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { encrypt, decrypt, tryDecryptJson, ACTIVE_KID } = require('../services/piiCrypto');

const ALLOWED_TABLES = {
  clients: { idCol: 'client_id' },
  cases:   { idCol: 'case_id' },
};

function table(req, res) {
  const t = (req.params.table || '').toLowerCase();
  if (!ALLOWED_TABLES[t]) {
    res.status(400).json({ error: `unsupported resource: ${t}` });
    return null;
  }
  return t;
}

// GET /api/pii/health — confirms a key can be loaded
router.get('/health', (req, res) => {
  try {
    const test = encrypt('ping', ACTIVE_KID);
    const round = decrypt(test);
    res.json({ ok: round === 'ping', active_kid: ACTIVE_KID });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/pii/:table/:resource_id — seal a plaintext JSON payload
router.post('/:table/:resource_id', async (req, res) => {
  try {
    const t = table(req, res); if (!t) return;
    const idCol = ALLOWED_TABLES[t].idCol;
    const id = req.params.resource_id;
    const payload = req.body && req.body.pii ? req.body.pii : req.body;
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ error: 'pii payload (JSON object) is required' });
    }
    const env = encrypt(payload, ACTIVE_KID);
    const sql = `UPDATE ${t} SET pii_encrypted = $1, pii_kid = $2, updated_at = NOW() WHERE ${idCol} = $3 RETURNING id, ${idCol} AS resource_id, pii_kid`;
    const r = await pool.query(sql, [env, ACTIVE_KID, id]);
    if (!r.rows.length) return res.status(404).json({ error: 'resource not found' });
    res.json({ sealed: true, ...r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/pii/:table/:resource_id — unseal (returns plaintext JSON)
router.get('/:table/:resource_id', async (req, res) => {
  try {
    const t = table(req, res); if (!t) return;
    const idCol = ALLOWED_TABLES[t].idCol;
    const id = req.params.resource_id;
    const sql = `SELECT id, ${idCol} AS resource_id, pii_encrypted, pii_kid FROM ${t} WHERE ${idCol} = $1`;
    const r = await pool.query(sql, [id]);
    if (!r.rows.length) return res.status(404).json({ error: 'resource not found' });
    const row = r.rows[0];
    if (!row.pii_encrypted) return res.json({ sealed: false, pii: null });
    const pii = tryDecryptJson(row.pii_encrypted);
    res.json({ sealed: true, pii_kid: row.pii_kid, pii });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/pii/:table/:resource_id — wipe sealed payload (NOT the row)
router.delete('/:table/:resource_id', async (req, res) => {
  try {
    const t = table(req, res); if (!t) return;
    const idCol = ALLOWED_TABLES[t].idCol;
    const id = req.params.resource_id;
    const sql = `UPDATE ${t} SET pii_encrypted = NULL, pii_kid = NULL, updated_at = NOW() WHERE ${idCol} = $1 RETURNING id, ${idCol} AS resource_id`;
    const r = await pool.query(sql, [id]);
    if (!r.rows.length) return res.status(404).json({ error: 'resource not found' });
    res.json({ wiped: true, ...r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
