// Apply pass 7: Court-date scheduling with deterministic conflict
// detection + RFC-5545 ICS export. Companion to AI court-calendar-conflicts;
// this route is the deterministic side (no LLM).

const express = require('express');
const router = express.Router();
const pool = require('../config/database');

function nextCdId() {
  return 'CD-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
}

function toDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function overlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

// GET /api/court-dates
router.get('/', async (req, res) => {
  try {
    const { attorney_id, case_id, from, to } = req.query || {};
    const where = []; const params = [];
    if (attorney_id) { params.push(attorney_id); where.push(`attorney_id = $${params.length}`); }
    if (case_id)     { params.push(case_id);     where.push(`case_id = $${params.length}`); }
    if (from)        { params.push(from);        where.push(`starts_at >= $${params.length}`); }
    if (to)          { params.push(to);          where.push(`starts_at <= $${params.length}`); }
    const sql = `SELECT * FROM court_dates ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY starts_at ASC LIMIT 500`;
    const r = await pool.query(sql, params);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/court-dates
router.post('/', async (req, res) => {
  try {
    const { case_id, attorney_id, court, starts_at, ends_at, kind, location, notes } = req.body || {};
    if (!starts_at) return res.status(400).json({ error: 'starts_at is required' });
    const s = toDate(starts_at);
    if (!s) return res.status(400).json({ error: 'invalid starts_at' });
    let e = toDate(ends_at);
    if (!e) e = new Date(s.getTime() + 60 * 60 * 1000); // default 1h
    const cdId = nextCdId();
    const r = await pool.query(
      `INSERT INTO court_dates
        (court_date_id, case_id, attorney_id, court, starts_at, ends_at, kind, location, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [cdId, case_id || null, attorney_id || null, court || null, s, e, kind || 'master_calendar', location || null, notes || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/court-dates/:id
router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const fields = ['case_id', 'attorney_id', 'court', 'starts_at', 'ends_at', 'kind', 'location', 'status', 'notes'];
    const sets = []; const params = [];
    for (const f of fields) {
      if (req.body && f in req.body) {
        params.push(req.body[f]);
        sets.push(`${f} = $${params.length}`);
      }
    }
    if (!sets.length) return res.status(400).json({ error: 'no fields to update' });
    params.push(id);
    const sql = `UPDATE court_dates SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${params.length} RETURNING *`;
    const r = await pool.query(sql, params);
    if (!r.rows.length) return res.status(404).json({ error: 'court date not found' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/court-dates/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const r = await pool.query('DELETE FROM court_dates WHERE id = $1 RETURNING id', [id]);
    if (!r.rows.length) return res.status(404).json({ error: 'court date not found' });
    res.json({ deleted: true, id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/court-dates/conflicts?attorney_id=X&from=...&to=...
// Deterministic O(n^2) sweep — no LLM. Returns concrete overlap pairs +
// "tight travel" pairs (different court, < 90 min between back-to-back).
router.get('/conflicts', async (req, res) => {
  try {
    const { attorney_id, from, to } = req.query || {};
    const where = []; const params = [];
    if (attorney_id && attorney_id !== 'ALL') { params.push(attorney_id); where.push(`attorney_id = $${params.length}`); }
    if (from) { params.push(from); where.push(`starts_at >= $${params.length}`); }
    if (to)   { params.push(to);   where.push(`starts_at <= $${params.length}`); }
    const sql = `SELECT * FROM court_dates ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY starts_at ASC`;
    const r = await pool.query(sql, params);
    const rows = r.rows.map((x) => ({ ...x, _s: new Date(x.starts_at), _e: new Date(x.ends_at) }));

    const conflicts = [];
    const tight_travel = [];
    for (let i = 0; i < rows.length; i++) {
      for (let j = i + 1; j < rows.length; j++) {
        const a = rows[i], b = rows[j];
        if (a.attorney_id && b.attorney_id && a.attorney_id !== b.attorney_id) continue;
        if (overlap(a._s, a._e, b._s, b._e)) {
          conflicts.push({
            type: 'double_book',
            severity: 'high',
            a: { id: a.id, court_date_id: a.court_date_id, court: a.court, starts_at: a.starts_at, ends_at: a.ends_at, case_id: a.case_id },
            b: { id: b.id, court_date_id: b.court_date_id, court: b.court, starts_at: b.starts_at, ends_at: b.ends_at, case_id: b.case_id },
            attorney_id: a.attorney_id || b.attorney_id || null,
          });
        } else if (b._s > a._e) {
          const gapMin = (b._s - a._e) / 60000;
          if (gapMin < 90 && a.court && b.court && a.court !== b.court) {
            tight_travel.push({
              type: 'tight_travel',
              severity: gapMin < 30 ? 'high' : 'medium',
              gap_minutes: Math.round(gapMin),
              from: { court: a.court, ends_at: a.ends_at, court_date_id: a.court_date_id },
              to:   { court: b.court, starts_at: b.starts_at, court_date_id: b.court_date_id },
              attorney_id: a.attorney_id || b.attorney_id || null,
            });
          }
          break; // sorted by start; later j's gap only grows
        }
      }
    }
    res.json({
      attorney_id: attorney_id || 'ALL',
      window: { from: from || null, to: to || null },
      total_court_dates: rows.length,
      conflicts,
      tight_travel,
      summary: `Deterministic scan: ${conflicts.length} double-book(s), ${tight_travel.length} tight-travel segment(s) across ${rows.length} court date(s).`,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/court-dates/ics?attorney_id=X&from=...&to=...
// RFC-5545 ICS export (text/calendar). No external deps.
router.get('/ics', async (req, res) => {
  try {
    const { attorney_id, case_id, from, to } = req.query || {};
    const where = []; const params = [];
    if (attorney_id && attorney_id !== 'ALL') { params.push(attorney_id); where.push(`attorney_id = $${params.length}`); }
    if (case_id) { params.push(case_id); where.push(`case_id = $${params.length}`); }
    if (from)    { params.push(from);    where.push(`starts_at >= $${params.length}`); }
    if (to)      { params.push(to);      where.push(`starts_at <= $${params.length}`); }
    const sql = `SELECT * FROM court_dates ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY starts_at ASC LIMIT 500`;
    const r = await pool.query(sql, params);

    const fmt = (d) => {
      const dt = new Date(d);
      const pad = (n) => String(n).padStart(2, '0');
      return (
        dt.getUTCFullYear().toString() +
        pad(dt.getUTCMonth() + 1) +
        pad(dt.getUTCDate()) + 'T' +
        pad(dt.getUTCHours()) +
        pad(dt.getUTCMinutes()) +
        pad(dt.getUTCSeconds()) + 'Z'
      );
    };
    const esc = (s) => String(s == null ? '' : s)
      .replace(/\\/g, '\\\\')
      .replace(/\n/g, '\\n')
      .replace(/,/g, '\\,')
      .replace(/;/g, '\\;');

    const now = fmt(new Date());
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//AIRefugeeAsylumCaseManager//Court Dates//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
    ];
    for (const row of r.rows) {
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${row.court_date_id}@asylum-case-manager`);
      lines.push(`DTSTAMP:${now}`);
      lines.push(`DTSTART:${fmt(row.starts_at)}`);
      lines.push(`DTEND:${fmt(row.ends_at || row.starts_at)}`);
      const title = `[${(row.kind || 'hearing').toUpperCase()}] ${row.case_id || ''} ${row.court || ''}`.trim();
      lines.push(`SUMMARY:${esc(title)}`);
      if (row.location) lines.push(`LOCATION:${esc(row.location)}`);
      const desc = [
        `Court Date ID: ${row.court_date_id}`,
        row.case_id ? `Case: ${row.case_id}` : '',
        row.attorney_id ? `Attorney: ${row.attorney_id}` : '',
        row.notes ? `Notes: ${row.notes}` : '',
      ].filter(Boolean).join('\n');
      if (desc) lines.push(`DESCRIPTION:${esc(desc)}`);
      lines.push('END:VEVENT');
    }
    lines.push('END:VCALENDAR');

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="court-dates.ics"');
    res.send(lines.join('\r\n'));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
