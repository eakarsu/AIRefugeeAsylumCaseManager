// Generic CRUD route factory.
// Builds list / get / create / update / delete + bulk-import (CSV) + attachments.
// Wire it like:
//   const buildCrud = require('./_crudFactory');
//   module.exports = buildCrud({ table: 'contracts', fields: [...] });

const express = require('express');
const pool = require('../config/database');
const { requireWriter } = require('../middleware/auth');
const { fireWebhook } = require('../services/webhooks');
const upload = require('../services/uploadStore');

function parseCsv(text) {
  // Minimal RFC-4180 parser. Handles quoted fields, escaped quotes, CRLF.
  const rows = [];
  let cur = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { field += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { cur.push(field); field = ''; }
      else if (ch === '\n') { cur.push(field); rows.push(cur); cur = []; field = ''; }
      else if (ch === '\r') { /* skip */ }
      else { field += ch; }
    }
  }
  if (field.length > 0 || cur.length > 0) { cur.push(field); rows.push(cur); }
  return rows.filter((r) => r.length > 1 || (r.length === 1 && r[0] !== ''));
}

function buildCrud({ table, fields, idPrefix = '', webhookPrefix = null }) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    try {
      const r = await pool.query(`SELECT * FROM ${table} ORDER BY id DESC`);
      res.json(r.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  router.get('/:id', async (req, res) => {
    try {
      const r = await pool.query(`SELECT * FROM ${table} WHERE id = $1`, [req.params.id]);
      if (!r.rows.length) return res.status(404).json({ error: 'not found' });
      res.json(r.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  router.post('/', requireWriter, async (req, res) => {
    try {
      const vals = fields.map((f) => req.body[f] ?? null);
      const ph = fields.map((_, i) => `$${i + 1}`).join(',');
      const r = await pool.query(
        `INSERT INTO ${table} (${fields.join(',')}) VALUES (${ph}) RETURNING *`,
        vals
      );
      if (webhookPrefix) {
        fireWebhook(`${webhookPrefix}.created`, { table, row: r.rows[0] }).catch(() => {});
      }
      res.status(201).json(r.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  router.put('/:id', requireWriter, async (req, res) => {
    try {
      const sets = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
      const vals = fields.map((f) => req.body[f] ?? null);
      vals.push(req.params.id);
      const r = await pool.query(
        `UPDATE ${table} SET ${sets}, updated_at = NOW() WHERE id = $${fields.length + 1} RETURNING *`,
        vals
      );
      if (!r.rows.length) return res.status(404).json({ error: 'not found' });
      res.json(r.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  router.delete('/:id', requireWriter, async (req, res) => {
    try {
      const r = await pool.query(`DELETE FROM ${table} WHERE id = $1 RETURNING *`, [req.params.id]);
      if (!r.rows.length) return res.status(404).json({ error: 'not found' });
      res.json({ message: 'deleted', row: r.rows[0] });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ───────────── Bulk CSV import ─────────────
  // Accepts either:
  //   - JSON body: { csv: "...", has_header: true }
  //   - raw text body (text/csv): the CSV body directly
  router.post('/bulk-import', requireWriter, express.text({ type: '*/*', limit: '20mb' }), async (req, res) => {
    try {
      let csvText = '';
      let hasHeader = true;
      if (typeof req.body === 'string' && req.body.length > 0) {
        csvText = req.body;
      } else if (req.body && typeof req.body === 'object' && req.body.csv) {
        csvText = req.body.csv;
        hasHeader = req.body.has_header !== false;
      }
      if (!csvText) return res.status(400).json({ error: 'csv body required' });

      const rows = parseCsv(csvText);
      if (rows.length === 0) return res.status(400).json({ error: 'csv is empty' });

      let header = fields;
      let dataRows = rows;
      if (hasHeader) {
        const first = rows[0].map((h) => h.trim());
        // Use header to map columns if it overlaps known fields
        const overlap = first.filter((h) => fields.includes(h));
        if (overlap.length > 0) {
          header = first;
        }
        dataRows = rows.slice(1);
      }

      let inserted = 0;
      const errors = [];
      for (const row of dataRows) {
        try {
          const obj = {};
          header.forEach((h, idx) => {
            if (fields.includes(h)) obj[h] = row[idx] === '' ? null : row[idx];
          });
          const cols = fields.filter((f) => Object.prototype.hasOwnProperty.call(obj, f));
          if (cols.length === 0) { errors.push({ row, reason: 'no matching columns' }); continue; }
          const vals = cols.map((c) => obj[c]);
          const ph = cols.map((_, i) => `$${i + 1}`).join(',');
          await pool.query(`INSERT INTO ${table} (${cols.join(',')}) VALUES (${ph})`, vals);
          inserted++;
        } catch (err) {
          errors.push({ row, reason: err.message });
        }
      }
      res.json({ table, inserted, failed: errors.length, errors: errors.slice(0, 20) });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // ───────────── Attachments (list + upload + download) ─────────────
  router.get('/:id/attachments', async (req, res) => {
    try {
      const r = await pool.query(
        'SELECT id, filename, original_name, mimetype, size_bytes, uploaded_by, created_at FROM attachments WHERE resource_type = $1 AND resource_id = $2 ORDER BY id DESC',
        [table, req.params.id]
      );
      res.json(r.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  router.post('/:id/attachments', requireWriter, upload.single('file'), async (req, res) => {
    try {
      const f = req.file;
      if (!f) return res.status(400).json({ error: 'file field required (multipart/form-data, key=file)' });
      const r = await pool.query(
        `INSERT INTO attachments (resource_type, resource_id, filename, original_name, mimetype, size_bytes, uploaded_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [table, req.params.id, f.filename, f.originalname, f.mimetype, f.size, req.user?.email || 'unknown']
      );
      res.status(201).json(r.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  return router;
}

module.exports = buildCrud;
