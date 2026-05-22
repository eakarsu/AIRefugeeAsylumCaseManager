// Government Benefits — Income Verification
// 18 CRUD + 16 AI verbs
'use strict';

const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { requireWriter } = require('../middleware/auth');
const { callOpenRouter, safeJsonParse } = require('../services/ai');

const TABLE = 'benefit_income_verification';

const _rl = new Map();
function aiRateLimit(req, res, next) {
  const key = req.user ? `u:${req.user.id}` : `ip:${req.ip}`;
  const now = Date.now(), win = 3600000, limit = 20;
  const e = _rl.get(key) || { c: 0, r: now + win };
  if (now > e.r) { e.c = 0; e.r = now + win; }
  e.c++; _rl.set(key, e);
  if (e.c > limit) return res.status(429).json({ error: 'Rate limit: 20 AI calls/hr' });
  next();
}

const SYS = 'You are a senior income verification specialist for government benefits programs (Medicaid, SNAP, TANF, SSI, housing). You have expertise in pay stub analysis, tax return interpretation, employer verification letters, self-employment net income calculations, irregular income annualization, prospective vs. historical budgeting, and income discrepancy resolution. Return strict JSON in the schema requested. Output is a decision-support aid, not a final agency determination.';

const FIELDS = ['case_id','applicant_id','verification_type','income_type','gross_monthly_income','net_monthly_income','employer_name','pay_frequency','verification_document','verification_date','discrepancy_flag','discrepancy_description','program_context','status','notes','ai_summary'];

// ── CRUD ─────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const where = []; const vals = [];
    if (req.query.case_id) { vals.push(req.query.case_id); where.push(`case_id = $${vals.length}`); }
    if (req.query.status) { vals.push(req.query.status); where.push(`status = $${vals.length}`); }
    const wClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [rows, cnt] = await Promise.all([
      pool.query(`SELECT * FROM ${TABLE} ${wClause} ORDER BY id DESC LIMIT $${vals.length+1} OFFSET $${vals.length+2}`, [...vals, limit, offset]),
      pool.query(`SELECT COUNT(*) FROM ${TABLE} ${wClause}`, vals)
    ]);
    res.json({ data: rows.rows, pagination: { page, limit, total: parseInt(cnt.rows[0].count), totalPages: Math.ceil(cnt.rows[0].count / limit) } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM ${TABLE} WHERE id = $1`, [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ data: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', requireWriter, async (req, res) => {
  try {
    const vals = FIELDS.map(k => req.body[k] ?? null);
    const ph = FIELDS.map((_,i) => `$${i+1}`).join(',');
    const r = await pool.query(`INSERT INTO ${TABLE} (${FIELDS.join(',')}) VALUES (${ph}) RETURNING *`, vals);
    res.status(201).json({ data: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', requireWriter, async (req, res) => {
  try {
    const sets = FIELDS.map((k,i) => `${k} = $${i+1}`).join(', ');
    const vals = [...FIELDS.map(k => req.body[k] ?? null), req.params.id];
    const r = await pool.query(`UPDATE ${TABLE} SET ${sets}, updated_at = NOW() WHERE id = $${FIELDS.length+1} RETURNING *`, vals);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ data: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', requireWriter, async (req, res) => {
  try {
    const r = await pool.query(`UPDATE ${TABLE} SET status = 'archived', updated_at = NOW() WHERE id = $1 RETURNING *`, [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ data: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/by-case/:case_id', async (req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM ${TABLE} WHERE case_id = $1 ORDER BY id DESC`, [req.params.case_id]);
    res.json({ data: r.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/by-applicant/:applicant_id', async (req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM ${TABLE} WHERE applicant_id = $1 ORDER BY id DESC`, [req.params.applicant_id]);
    res.json({ data: r.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/batch', requireWriter, async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'items[] required' });
    const created = [];
    for (const item of items) {
      const vals = FIELDS.map(k => item[k] ?? null);
      const ph = FIELDS.map((_,i) => `$${i+1}`).join(',');
      const r = await pool.query(`INSERT INTO ${TABLE} (${FIELDS.join(',')}) VALUES (${ph}) RETURNING *`, vals);
      created.push(r.rows[0]);
    }
    res.status(201).json({ data: created, count: created.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/batch', requireWriter, async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'items[] required' });
    const results = [];
    for (const { id, ...fields } of items) {
      const keys = Object.keys(fields); if (!keys.length) { results.push({ error: 'no fields', id }); continue; }
      const sets = keys.map((k,i) => `${k} = $${i+1}`).join(', ');
      const r = await pool.query(`UPDATE ${TABLE} SET ${sets}, updated_at = NOW() WHERE id = $${keys.length+1} RETURNING *`, [...keys.map(k => fields[k]), id]);
      results.push(r.rows[0] || { error: 'not found', id });
    }
    res.json({ data: results });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/batch', requireWriter, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'ids[] required' });
    const ph = ids.map((_,i) => `$${i+1}`).join(',');
    const r = await pool.query(`UPDATE ${TABLE} SET status = 'archived', updated_at = NOW() WHERE id IN (${ph}) RETURNING id`, ids);
    res.json({ updated: r.rowCount });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/meta/count', async (req, res) => {
  try {
    const r = await pool.query(`SELECT COUNT(*) FROM ${TABLE}`);
    res.json({ count: parseInt(r.rows[0].count) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/meta/search', async (req, res) => {
  try {
    const q = `%${req.query.q || ''}%`;
    const r = await pool.query(`SELECT * FROM ${TABLE} WHERE notes ILIKE $1 OR employer_name ILIKE $1 OR income_type ILIKE $1 ORDER BY id DESC LIMIT 50`, [q]);
    res.json({ data: r.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/:id/archive', requireWriter, async (req, res) => {
  try {
    const r = await pool.query(`UPDATE ${TABLE} SET status = 'archived', updated_at = NOW() WHERE id = $1 RETURNING *`, [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ data: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/:id/restore', requireWriter, async (req, res) => {
  try {
    const r = await pool.query(`UPDATE ${TABLE} SET status = 'active', updated_at = NOW() WHERE id = $1 RETURNING *`, [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ data: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id/history', async (req, res) => {
  try {
    const rec = await pool.query(`SELECT * FROM ${TABLE} WHERE id = $1`, [req.params.id]);
    if (!rec.rows.length) return res.status(404).json({ error: 'Not found' });
    const logs = await pool.query(`SELECT * FROM ai_results WHERE feature ILIKE '%income%' ORDER BY id DESC LIMIT 50`);
    res.json({ data: logs.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/meta/export-csv', async (req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM ${TABLE} ORDER BY id DESC`);
    if (!r.rows.length) return res.json({ csv: '' });
    const headers = Object.keys(r.rows[0]);
    const csv = [headers.join(','), ...r.rows.map(row => headers.map(h => `"${String(row[h] ?? '').replace(/"/g,'""')}"`).join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${TABLE}.csv"`);
    res.send(csv);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/meta/import-csv', requireWriter, async (req, res) => {
  try {
    const { csv } = req.body;
    if (!csv) return res.status(400).json({ error: 'csv field required' });
    const lines = csv.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return res.status(400).json({ error: 'Need header + 1 row' });
    const headers = lines[0].split(',').map(h => h.replace(/"/g,'').trim());
    let inserted = 0;
    for (const line of lines.slice(1)) {
      const vals = (line.match(/(".*?"|[^,]+)/g) || []).map(v => v.replace(/^"|"$/g,'').replace(/""/g,'"'));
      const obj = {}; headers.forEach((h,i) => { obj[h] = vals[i] ?? null; });
      const cols = FIELDS.filter(k => obj[k] !== undefined);
      if (!cols.length) continue;
      const ph = cols.map((_,i) => `$${i+1}`).join(',');
      await pool.query(`INSERT INTO ${TABLE} (${cols.join(',')}) VALUES (${ph})`, cols.map(k => obj[k]));
      inserted++;
    }
    res.json({ inserted });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/meta/stats-summary', async (req, res) => {
  try {
    const [byType, byStatus, byDiscrepancy] = await Promise.all([
      pool.query(`SELECT verification_type, COUNT(*) as count FROM ${TABLE} GROUP BY verification_type`),
      pool.query(`SELECT status, COUNT(*) as count FROM ${TABLE} GROUP BY status`),
      pool.query(`SELECT discrepancy_flag, COUNT(*) as count FROM ${TABLE} GROUP BY discrepancy_flag`)
    ]);
    res.json({ byType: byType.rows, byStatus: byStatus.rows, byDiscrepancy: byDiscrepancy.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─────────────────────── AI verbs ────────────────────────────

async function loadRecord(id, res) {
  const r = await pool.query(`SELECT * FROM ${TABLE} WHERE id = $1`, [id]);
  if (!r.rows.length) { res.status(404).json({ error: 'Record not found' }); return null; }
  return r.rows[0];
}

router.post('/ai/parse-paystub', aiRateLimit, async (req, res) => {
  try {
    const data = req.body;
    const result = safeJsonParse(await callOpenRouter(SYS, `Parse and extract income data from this pay stub description/text. Data: ${JSON.stringify(data)}. Return JSON: {"gross_pay": number, "net_pay": number, "pay_period": string, "pay_date": string, "employer": string, "ytd_gross": number, "deductions": [{"type": string, "amount": number}], "annualized_gross": number, "monthly_gross": number}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/parse-tax-return', aiRateLimit, async (req, res) => {
  try {
    const data = req.body;
    const result = safeJsonParse(await callOpenRouter(SYS, `Extract income data from this tax return description for benefits eligibility purposes. Data: ${JSON.stringify(data)}. Return JSON: {"tax_year": number, "agi": number, "wages_salaries": number, "self_employment_income": number, "other_income": [{"type": string, "amount": number}], "monthly_average": number, "notes": string}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/parse-employer-letter', aiRateLimit, async (req, res) => {
  try {
    const data = req.body;
    const result = safeJsonParse(await callOpenRouter(SYS, `Extract and verify income information from this employer letter/attestation. Data: ${JSON.stringify(data)}. Return JSON: {"employer_name": string, "hire_date": string, "employment_status": string, "hourly_rate": number, "weekly_hours": number, "monthly_gross": number, "letter_date": string, "authorized_signature": boolean, "reliability": "high|medium|low"}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/classify-income-type', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Classify this income by type for benefits eligibility purposes (earned, unearned, self-employment, irregular, in-kind, exempt). Data: ${JSON.stringify(rec)}. Return JSON: {"income_type": string, "sub_type": string, "countable": boolean, "countable_by_program": {"medicaid": boolean, "snap": boolean, "tanf": boolean, "ssi": boolean}, "notes": string}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/predict-income-stability', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Predict the stability of this income stream for purposes of prospective budgeting. Data: ${JSON.stringify(rec)}. Return JSON: {"stability": "stable|unstable|irregular", "confidence": number, "stability_factors": [string], "recommended_approach": "prospective|historical|12-month-average", "notes": string}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/suggest-verification-source', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Suggest the best verification source for this income given the applicant's situation. Data: ${JSON.stringify(rec)}. Return JSON: {"primary_source": string, "alternative_sources": [string], "self_attestation_allowed": boolean, "good_cause_for_alternative": string, "verification_timeline_days": number}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/generate-discrepancy-narrative', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Generate a clear narrative explaining any income discrepancy found in this case. Data: ${JSON.stringify(rec)}. Return JSON: {"discrepancy_narrative": string, "reported_income": number, "verified_income": number, "difference": number, "possible_explanations": [string], "recommended_action": string}`), {});
    if (rec.id) await pool.query(`UPDATE ${TABLE} SET ai_summary = $1 WHERE id = $2`, [result.discrepancy_narrative || '', rec.id]).catch(()=>{});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/summarize-12-month-income', aiRateLimit, async (req, res) => {
  try {
    const data = req.body;
    const result = safeJsonParse(await callOpenRouter(SYS, `Summarize and calculate 12-month average income from available income records for benefits budgeting. Data: ${JSON.stringify(data)}. Return JSON: {"monthly_breakdown": [{"month": string, "income": number}], "12_month_total": number, "monthly_average": number, "peak_month": string, "lowest_month": string, "irregularity_score": number}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/validate-pay-frequency', aiRateLimit, async (req, res) => {
  try {
    const data = req.body;
    const result = safeJsonParse(await callOpenRouter(SYS, `Validate the pay frequency and calculate the correct monthly income conversion. Data: ${JSON.stringify(data)}. Return JSON: {"pay_frequency": string, "multiplier": number, "weekly_gross": number, "bi_weekly_gross": number, "semi_monthly_gross": number, "monthly_gross": number, "validation_notes": string}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/recommend-prospective-vs-historical', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Recommend whether prospective or historical income budgeting should be used for this benefits determination. Data: ${JSON.stringify(rec)}. Return JSON: {"recommendation": "prospective|historical|12-month-average", "rationale": string, "program_rules": {"medicaid": string, "snap": string, "tanf": string}, "applicant_situation": string}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/classify-irregular-income', aiRateLimit, async (req, res) => {
  try {
    const data = req.body;
    const result = safeJsonParse(await callOpenRouter(SYS, `Classify and annualize irregular income for benefits purposes (seasonal, on-call, gig economy, per diem). Data: ${JSON.stringify(data)}. Return JSON: {"irregular_type": string, "annualization_method": string, "monthly_converted": number, "months_of_work": number, "notes": string}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/predict-income-trend', aiRateLimit, async (req, res) => {
  try {
    const data = req.body;
    const result = safeJsonParse(await callOpenRouter(SYS, `Predict the income trend for this applicant based on historical data and employment situation. Data: ${JSON.stringify(data)}. Return JSON: {"trend": "increasing|stable|decreasing|volatile", "predicted_6mo_income": number, "confidence": number, "trend_drivers": [string], "benefits_impact": string}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/detect-undisclosed-income', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Identify indicators of potentially undisclosed income sources. Data: ${JSON.stringify(rec)}. Return JSON: {"undisclosed_income_indicators": [{"indicator": string, "source_suspected": string, "verification_needed": string}], "overall_risk": "low|moderate|high", "recommended_development": [string]}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/generate-rfp-request', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Draft a Request for Information/verification (RFI) letter to the applicant or employer for income verification. Data: ${JSON.stringify(rec)}. Return JSON: {"rfp_letter": string, "documents_requested": [string], "deadline_days": number, "good_cause_language": string}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/score-verification-quality', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Score the quality and reliability of this income verification on a 0-100 scale. Data: ${JSON.stringify(rec)}. Return JSON: {"quality_score": number, "strengths": [string], "weaknesses": [string], "meets_program_standard": boolean, "additional_verification_needed": boolean}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/suggest-self-employment-net-calc', aiRateLimit, async (req, res) => {
  try {
    const data = req.body;
    const result = safeJsonParse(await callOpenRouter(SYS, `Calculate self-employment net income for benefits purposes using allowable business expense deductions. Data: ${JSON.stringify(data)}. Return JSON: {"gross_self_employment": number, "allowable_expenses": [{"expense": string, "amount": number}], "net_self_employment": number, "monthly_net": number, "snap_deduction_40pct": number, "ssi_earned_income_exclusion": number, "notes": string}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
