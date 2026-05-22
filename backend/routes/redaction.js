// Apply pass 7: Document redaction pipeline.
// Tracks page-level masks against an attachment / evidence doc.
// Pipeline stages: draft -> applied -> reverted.
// No new deps — we store mask geometry as JSONB and a sidecar JSON file
// containing the burn-in instructions next to the original upload.

const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const pool = require('../config/database');
const { UPLOAD_DIR } = require('../services/uploadStore');

function nextRedactionId() {
  return 'RED-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
}

function validateMasks(input) {
  if (!Array.isArray(input)) return [];
  return input.map((m, i) => ({
    page: Number(m.page) || 1,
    x: Number(m.x) || 0,
    y: Number(m.y) || 0,
    w: Number(m.w) || 0,
    h: Number(m.h) || 0,
    label: String(m.label || `mask_${i + 1}`).slice(0, 80),
  })).filter((m) => m.w > 0 && m.h > 0);
}

// GET /api/redactions — list all redactions
router.get('/', async (req, res) => {
  try {
    const { attachment_id, evidence_doc_id, status } = req.query || {};
    const where = []; const params = [];
    if (attachment_id)   { params.push(Number(attachment_id));   where.push(`attachment_id = $${params.length}`); }
    if (evidence_doc_id) { params.push(String(evidence_doc_id)); where.push(`evidence_doc_id = $${params.length}`); }
    if (status)          { params.push(String(status));          where.push(`status = $${params.length}`); }
    const sql = `SELECT * FROM document_redactions ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY created_at DESC LIMIT 200`;
    const r = await pool.query(sql, params);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/redactions — create a draft redaction
router.post('/', async (req, res) => {
  try {
    const { attachment_id, evidence_doc_id, masks, reason, watermark } = req.body || {};
    if (!attachment_id && !evidence_doc_id) {
      return res.status(400).json({ error: 'attachment_id or evidence_doc_id is required' });
    }
    const validatedMasks = validateMasks(masks);
    if (!validatedMasks.length) return res.status(400).json({ error: 'at least one valid mask is required' });
    const rid = nextRedactionId();
    const applied_by = req.user?.email || 'system';
    const r = await pool.query(
      `INSERT INTO document_redactions
         (redaction_id, attachment_id, evidence_doc_id, masks, reason, applied_by, status, watermark)
       VALUES ($1, $2, $3, $4, $5, $6, 'draft', $7)
       RETURNING *`,
      [rid, attachment_id ? Number(attachment_id) : null, evidence_doc_id || null,
       JSON.stringify(validatedMasks), reason || null, applied_by, watermark || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/redactions/:id/apply — mark applied, write sidecar burn-in spec
router.post('/:id/apply', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const r = await pool.query('SELECT * FROM document_redactions WHERE id = $1', [id]);
    if (!r.rows.length) return res.status(404).json({ error: 'redaction not found' });
    const row = r.rows[0];

    // Write a sidecar JSON file alongside the upload so a downstream burn-in
    // worker (poppler/ghostscript) can ingest it without DB access.
    let redactedPath = null;
    if (row.attachment_id) {
      const att = await pool.query('SELECT filename FROM attachments WHERE id = $1', [row.attachment_id]);
      if (att.rows.length) {
        const baseFile = att.rows[0].filename;
        const sidecarName = `${baseFile}.redactions.${row.redaction_id}.json`;
        const sidecarPath = path.join(UPLOAD_DIR, sidecarName);
        try {
          fs.writeFileSync(sidecarPath, JSON.stringify({
            redaction_id: row.redaction_id,
            attachment_id: row.attachment_id,
            base_filename: baseFile,
            masks: row.masks,
            reason: row.reason,
            watermark: row.watermark,
            applied_by: row.applied_by,
            applied_at: new Date().toISOString(),
          }, null, 2));
          redactedPath = sidecarName;
        } catch (e) {
          console.warn('[redaction] sidecar write failed:', e.message);
        }
      }
    }

    const upd = await pool.query(
      `UPDATE document_redactions
         SET status = 'applied', redacted_path = COALESCE($1, redacted_path), updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [redactedPath, id]
    );
    res.json(upd.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/redactions/:id/revert
router.post('/:id/revert', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const upd = await pool.query(
      `UPDATE document_redactions SET status = 'reverted', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );
    if (!upd.rows.length) return res.status(404).json({ error: 'redaction not found' });
    res.json(upd.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/redactions/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const r = await pool.query('DELETE FROM document_redactions WHERE id = $1 RETURNING id', [id]);
    if (!r.rows.length) return res.status(404).json({ error: 'redaction not found' });
    res.json({ deleted: true, id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
