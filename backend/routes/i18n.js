// Apply pass 7: i18n framework scaffold.
// Server-side string bundles keyed by (locale, namespace, key).
// Frontend pulls /api/i18n/bundle/:locale and falls back to 'en'.

const express = require('express');
const router = express.Router();
const pool = require('../config/database');

const SUPPORTED_LOCALES = ['en', 'es', 'fr', 'ar', 'uk', 'fa', 'sw', 'ti', 'ps', 'ru', 'zh', 'my'];

// GET /api/i18n/locales
router.get('/locales', async (req, res) => {
  try {
    const r = await pool.query('SELECT DISTINCT locale FROM i18n_strings ORDER BY locale ASC');
    const have = r.rows.map((x) => x.locale);
    res.json({
      supported: SUPPORTED_LOCALES,
      seeded: have,
      default: 'en',
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/i18n/bundle/:locale?namespace=common
router.get('/bundle/:locale', async (req, res) => {
  try {
    const locale = (req.params.locale || 'en').toLowerCase();
    const namespace = (req.query.namespace || 'common').toString();
    const r = await pool.query(
      `SELECT string_key, value FROM i18n_strings WHERE locale = $1 AND namespace = $2 ORDER BY string_key ASC`,
      [locale, namespace]
    );
    const bundle = {};
    for (const row of r.rows) bundle[row.string_key] = row.value;
    // Always merge English fallback under a separate field so the client can fall back per-key.
    let fallback = {};
    if (locale !== 'en') {
      const en = await pool.query(
        `SELECT string_key, value FROM i18n_strings WHERE locale = 'en' AND namespace = $1`,
        [namespace]
      );
      for (const row of en.rows) fallback[row.string_key] = row.value;
    }
    res.json({ locale, namespace, bundle, fallback_locale: 'en', fallback });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/i18n/strings — upsert one string
router.put('/strings', async (req, res) => {
  try {
    const { locale, namespace, string_key, value } = req.body || {};
    if (!locale || !string_key) return res.status(400).json({ error: 'locale and string_key are required' });
    const ns = namespace || 'common';
    const r = await pool.query(
      `INSERT INTO i18n_strings (locale, namespace, string_key, value, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (locale, namespace, string_key)
       DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
       RETURNING *`,
      [locale, ns, string_key, value || '']
    );
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/i18n/strings?locale=&namespace=&string_key=
router.delete('/strings', async (req, res) => {
  try {
    const { locale, namespace, string_key } = req.query || {};
    if (!locale || !string_key) return res.status(400).json({ error: 'locale and string_key are required' });
    const ns = namespace || 'common';
    const r = await pool.query(
      `DELETE FROM i18n_strings WHERE locale = $1 AND namespace = $2 AND string_key = $3 RETURNING id`,
      [locale, ns, string_key]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'string not found' });
    res.json({ deleted: true, id: r.rows[0].id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
