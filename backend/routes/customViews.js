// Custom analytics views — 4 endpoints powering CustomViewsPage.
//   GET /api/custom-views/case-timeline
//   GET /api/custom-views/hearing-calendar?year=YYYY&month=MM
//   GET /api/custom-views/origin-heatmap
//   GET /api/custom-views/grant-funnel
const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// (1) Case Status Timeline — horizontal bar data per case
//     start = intake_date (from client), end = latest hearing date for the case
router.get('/case-timeline', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 25, 100);
    const sql = `
      SELECT
        c.case_id,
        c.client_id,
        cl.full_name             AS client_name,
        cl.country_of_origin     AS country,
        cl.intake_date           AS intake_date,
        c.opened_at              AS opened_at,
        c.status                 AS status,
        c.lead_attorney          AS lead_attorney,
        (
          SELECT MAX(h.date)::date FROM hearings h WHERE h.case_id = c.case_id
        ) AS last_hearing_date,
        (
          SELECT COUNT(*) FROM hearings h WHERE h.case_id = c.case_id
        ) AS hearing_count
      FROM cases c
      LEFT JOIN clients cl ON cl.client_id = c.client_id
      ORDER BY cl.intake_date NULLS LAST
      LIMIT $1
    `;
    const { rows } = await pool.query(sql, [limit]);

    const today = new Date();
    const series = rows.map((r) => {
      const start = r.intake_date || r.opened_at || null;
      const end   = r.last_hearing_date || today.toISOString().slice(0, 10);
      let days = 0;
      if (start) {
        const s = new Date(start);
        const e = new Date(end);
        days = Math.max(1, Math.round((e - s) / 86400000));
      }
      const label = `${r.case_id || '?'} · ${(r.client_name || r.client_id || '').slice(0, 28)}`;
      return {
        case_id: r.case_id,
        client_id: r.client_id,
        client_name: r.client_name,
        country: r.country,
        status: r.status,
        lead_attorney: r.lead_attorney,
        start_date: start,
        end_date: end,
        days_open: days,
        hearing_count: Number(r.hearing_count) || 0,
        label,
      };
    });

    res.json({ count: series.length, series });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// (2) Hearing Calendar — CSS 7x4 grid: per-day hearing counts (optionally by court)
router.get('/hearing-calendar', async (req, res) => {
  try {
    const now = new Date();
    const year  = parseInt(req.query.year,  10) || now.getUTCFullYear();
    const month = parseInt(req.query.month, 10) || (now.getUTCMonth() + 1); // 1..12

    const start = new Date(Date.UTC(year, month - 1, 1));
    const end   = new Date(Date.UTC(year, month, 1));

    const sql = `
      SELECT
        (date AT TIME ZONE 'UTC')::date AS day,
        COALESCE(court, 'Unknown') AS court,
        COUNT(*)::int AS hearings
      FROM hearings
      WHERE date >= $1 AND date < $2
      GROUP BY day, court
      ORDER BY day, court
    `;
    const { rows } = await pool.query(sql, [start.toISOString(), end.toISOString()]);

    const byDay = {};
    const courtTotals = {};
    for (const r of rows) {
      const k = (r.day instanceof Date ? r.day.toISOString().slice(0, 10) : String(r.day).slice(0, 10));
      if (!byDay[k]) byDay[k] = { date: k, total: 0, courts: {} };
      byDay[k].courts[r.court] = (byDay[k].courts[r.court] || 0) + r.hearings;
      byDay[k].total += r.hearings;
      courtTotals[r.court] = (courtTotals[r.court] || 0) + r.hearings;
    }

    // build 4-week grid (28 cells) starting on Sunday of week containing day 1
    const firstDow = start.getUTCDay(); // 0..6
    const gridStart = new Date(start.getTime());
    gridStart.setUTCDate(gridStart.getUTCDate() - firstDow);
    const days = [];
    for (let i = 0; i < 28; i++) {
      const d = new Date(gridStart.getTime());
      d.setUTCDate(d.getUTCDate() + i);
      const k = d.toISOString().slice(0, 10);
      const inMonth = d.getUTCMonth() === (month - 1) && d.getUTCFullYear() === year;
      days.push({
        date: k,
        day: d.getUTCDate(),
        in_month: inMonth,
        total: byDay[k]?.total || 0,
        courts: byDay[k]?.courts || {},
      });
    }

    res.json({
      year,
      month,
      month_label: start.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' }),
      grid: days, // exactly 28 (7x4)
      court_totals: courtTotals,
      total_hearings: rows.reduce((s, r) => s + r.hearings, 0),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// (3) Country-of-Origin Heatmap — treemap data of clients by country_of_origin
router.get('/origin-heatmap', async (req, res) => {
  try {
    const sql = `
      SELECT
        COALESCE(NULLIF(country_of_origin, ''), 'Unknown') AS country,
        COUNT(*)::int AS client_count,
        COUNT(*) FILTER (WHERE status = 'active')::int AS active_count,
        COUNT(*) FILTER (WHERE status = 'intake')::int AS intake_count
      FROM clients
      GROUP BY country
      ORDER BY client_count DESC
    `;
    const { rows } = await pool.query(sql);
    const palette = [
      '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#a78bfa',
      '#ec4899', '#22c55e', '#ef4444', '#0ea5e9', '#14b8a6',
      '#fb7185', '#facc15', '#a3e635', '#60a5fa', '#7dd3fc',
      '#f472b6', '#dc2626', '#34d399', '#8b5cf6', '#fbbf24',
    ];
    const treemap = rows.map((r, i) => ({
      name: r.country,
      size: r.client_count, // recharts Treemap uses dataKey
      value: r.client_count,
      active: r.active_count,
      intake: r.intake_count,
      fill: palette[i % palette.length],
    }));
    res.json({
      count: treemap.length,
      total_clients: rows.reduce((s, r) => s + r.client_count, 0),
      treemap,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// (4) Asylum Grant Funnel — intake -> hearing -> grant -> appeal
router.get('/grant-funnel', async (req, res) => {
  try {
    const [intakeQ, hearingQ, grantQ, appealQ] = await Promise.all([
      pool.query("SELECT COUNT(*)::int AS n FROM cases"),
      pool.query("SELECT COUNT(DISTINCT case_id)::int AS n FROM hearings"),
      pool.query("SELECT COUNT(*)::int AS n FROM asylum_grants WHERE status = 'granted'"),
      pool.query(`
        SELECT COUNT(*)::int AS n FROM asylum_grants
         WHERE status IN ('denied','referred','withdrawn')
            OR case_id IN (SELECT case_id FROM deportation_orders WHERE status = 'on_appeal')
      `),
    ]);

    const intake  = intakeQ.rows[0].n;
    const hearing = hearingQ.rows[0].n;
    const granted = grantQ.rows[0].n;
    const appeal  = appealQ.rows[0].n;

    const stages = [
      { stage: 'Intake',  value: intake,  fill: '#3b82f6' },
      { stage: 'Hearing', value: hearing, fill: '#06b6d4' },
      { stage: 'Grant',   value: granted, fill: '#10b981' },
      { stage: 'Appeal',  value: appeal,  fill: '#f59e0b' },
    ];

    // conversion ratios stage-to-stage
    for (let i = 0; i < stages.length; i++) {
      const prev = i === 0 ? null : stages[i - 1].value;
      stages[i].conversion_pct = prev && prev > 0
        ? Math.round((stages[i].value / prev) * 1000) / 10
        : (i === 0 ? 100 : 0);
    }

    res.json({
      stages,
      overall_grant_rate_pct: intake > 0 ? Math.round((granted / intake) * 1000) / 10 : 0,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
