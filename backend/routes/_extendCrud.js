// Wraps an existing CRUD router (the 8 legacy ones) with:
//   - RBAC on write verbs (POST/PUT/PATCH/DELETE → requireWriter)
//   - /bulk-import endpoint
//   - /:id/attachments list + upload
//
// This is a non-invasive layer: we mount a new outer router that handles the
// extra endpoints + RBAC, and only delegates GET / other verbs to the inner
// router. We never edit the original routes/<name>.js files.

const express = require('express');
const pool = require('../config/database');
const { requireWriter } = require('../middleware/auth');
const upload = require('../services/uploadStore');

function parseCsv(text) {
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

function extendCrud(innerRouter, { table, fields, onCreated }) {
  const outer = express.Router();

  // Pre-handler: hook POST responses (after inner handler) for side-effects
  if (typeof onCreated === 'function') {
    outer.use((req, res, next) => {
      if (req.method !== 'POST') return next();
      const origJson = res.json.bind(res);
      res.json = (body) => {
        try {
          if (res.statusCode === 201 && body && body.id) {
            Promise.resolve(onCreated(body, req)).catch((e) =>
              console.warn(`[extendCrud] onCreated failed for ${table}:`, e.message)
            );
          }
        } catch (_) {}
        return origJson(body);
      };
      next();
    });
  }

  // Apply RBAC for writes BEFORE delegating to inner router
  outer.use((req, res, next) => {
    // attachments + bulk-import are handled below; if they ever reach inner
    // they would 404 anyway. So allow our own routes through.
    if (req.path === '/bulk-import' || /^\/[^/]+\/attachments$/.test(req.path)) {
      return next();
    }
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      return requireWriter(req, res, next);
    }
    return next();
  });

  // Bulk CSV import
  outer.post(
    '/bulk-import',
    requireWriter,
    express.text({ type: '*/*', limit: '20mb' }),
    async (req, res) => {
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
          const overlap = first.filter((h) => fields.includes(h));
          if (overlap.length > 0) header = first;
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
    }
  );

  // Attachments — list
  outer.get('/:id/attachments', async (req, res) => {
    try {
      const r = await pool.query(
        'SELECT id, filename, original_name, mimetype, size_bytes, uploaded_by, created_at FROM attachments WHERE resource_type = $1 AND resource_id = $2 ORDER BY id DESC',
        [table, req.params.id]
      );
      res.json(r.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // Attachments — upload
  outer.post('/:id/attachments', requireWriter, upload.single('file'), async (req, res) => {
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

  // Fall through to inner CRUD for everything else
  outer.use(innerRouter);

  return outer;
}

module.exports = extendCrud;
