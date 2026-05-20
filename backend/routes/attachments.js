const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const pool = require('../config/database');
const upload = require('../services/uploadStore');
const { requireWriter } = require('../middleware/auth');

// GET /api/attachments?resource_type=&resource_id=
router.get('/', async (req, res) => {
  try {
    const { resource_type, resource_id } = req.query;
    let r;
    if (resource_type && resource_id) {
      r = await pool.query(
        'SELECT * FROM attachments WHERE resource_type = $1 AND resource_id = $2 ORDER BY id DESC',
        [resource_type, resource_id]
      );
    } else {
      r = await pool.query('SELECT * FROM attachments ORDER BY id DESC LIMIT 200');
    }
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/attachments (multipart, key=file, body fields resource_type / resource_id)
router.post('/', requireWriter, upload.single('file'), async (req, res) => {
  try {
    const f = req.file;
    if (!f) return res.status(400).json({ error: 'file is required (multipart/form-data, key=file)' });
    const { resource_type, resource_id } = req.body || {};
    const r = await pool.query(
      `INSERT INTO attachments (resource_type, resource_id, filename, original_name, mimetype, size_bytes, uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [
        resource_type || null,
        resource_id ? Number(resource_id) : null,
        f.filename,
        f.originalname,
        f.mimetype,
        f.size,
        req.user?.email || 'unknown',
      ]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/attachments/:id/download
router.get('/:id/download', async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM attachments WHERE id = $1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'not found' });
    const a = r.rows[0];
    const filePath = path.join(upload.UPLOAD_DIR, a.filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'file missing on disk' });
    res.setHeader('Content-Type', a.mimetype || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${a.original_name}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', requireWriter, async (req, res) => {
  try {
    const r = await pool.query('DELETE FROM attachments WHERE id = $1 RETURNING *', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'not found' });
    try {
      const filePath = path.join(upload.UPLOAD_DIR, r.rows[0].filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (_) {}
    res.json({ message: 'deleted', row: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
