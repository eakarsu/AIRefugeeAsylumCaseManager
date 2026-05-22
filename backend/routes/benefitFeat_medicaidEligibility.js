// Government Benefits — Medicaid Eligibility
// 18 CRUD + 16 AI verbs
'use strict';

const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { requireWriter } = require('../middleware/auth');
const { callOpenRouter, safeJsonParse } = require('../services/ai');

const TABLE = 'benefit_medicaid_eligibility';

// ── Rate limiter ──────────────────────────────────────────────
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

const SYS = 'You are a senior government benefits eligibility specialist with deep expertise in Medicaid MAGI and non-MAGI rules, 42 CFR Part 435, ACA expansion, five-year bars for non-citizens, and state-specific Medicaid plans. You support eligibility workers at a refugee legal aid clinic. Return strict JSON in the schema requested. Output is a decision-support aid, not a final agency determination.';

// ─────────────────────────── CRUD ────────────────────────────

// 1. list
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const where = []; const vals = [];
    if (req.query.case_id) { vals.push(req.query.case_id); where.push(`case_id = $${vals.length}`); }
    if (req.query.applicant_id) { vals.push(req.query.applicant_id); where.push(`applicant_id = $${vals.length}`); }
    if (req.query.status) { vals.push(req.query.status); where.push(`status = $${vals.length}`); }
    const wClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [rows, cnt] = await Promise.all([
      pool.query(`SELECT * FROM ${TABLE} ${wClause} ORDER BY id DESC LIMIT $${vals.length+1} OFFSET $${vals.length+2}`, [...vals, limit, offset]),
      pool.query(`SELECT COUNT(*) FROM ${TABLE} ${wClause}`, vals)
    ]);
    res.json({ data: rows.rows, pagination: { page, limit, total: parseInt(cnt.rows[0].count), totalPages: Math.ceil(cnt.rows[0].count / limit) } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 2. get by id
router.get('/:id', async (req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM ${TABLE} WHERE id = $1`, [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ data: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 3. create
router.post('/', requireWriter, async (req, res) => {
  try {
    const f = ['case_id','applicant_id','eligibility_pathway','magi_income','fpl_percentage','household_size','citizenship_status','immigration_status','five_year_bar_applies','state','program_type','determination_date','renewal_date','status','notes','ai_summary'];
    const vals = f.map(k => req.body[k] ?? null);
    const ph = f.map((_,i) => `$${i+1}`).join(',');
    const r = await pool.query(`INSERT INTO ${TABLE} (${f.join(',')}) VALUES (${ph}) RETURNING *`, vals);
    res.status(201).json({ data: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 4. update
router.put('/:id', requireWriter, async (req, res) => {
  try {
    const f = ['case_id','applicant_id','eligibility_pathway','magi_income','fpl_percentage','household_size','citizenship_status','immigration_status','five_year_bar_applies','state','program_type','determination_date','renewal_date','status','notes','ai_summary'];
    const sets = f.map((k,i) => `${k} = $${i+1}`).join(', ');
    const vals = [...f.map(k => req.body[k] ?? null), req.params.id];
    const r = await pool.query(`UPDATE ${TABLE} SET ${sets}, updated_at = NOW() WHERE id = $${f.length+1} RETURNING *`, vals);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ data: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 5. soft-delete
router.delete('/:id', requireWriter, async (req, res) => {
  try {
    const r = await pool.query(`UPDATE ${TABLE} SET status = 'archived', updated_at = NOW() WHERE id = $1 RETURNING *`, [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ data: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 6. by-case
router.get('/by-case/:case_id', async (req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM ${TABLE} WHERE case_id = $1 ORDER BY id DESC`, [req.params.case_id]);
    res.json({ data: r.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 7. by-applicant
router.get('/by-applicant/:applicant_id', async (req, res) => {
  try {
    const r = await pool.query(`SELECT * FROM ${TABLE} WHERE applicant_id = $1 ORDER BY id DESC`, [req.params.applicant_id]);
    res.json({ data: r.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 8. batch-create
router.post('/batch', requireWriter, async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'items[] required' });
    const f = ['case_id','applicant_id','eligibility_pathway','magi_income','fpl_percentage','household_size','citizenship_status','immigration_status','five_year_bar_applies','state','program_type','determination_date','renewal_date','status','notes','ai_summary'];
    const created = [];
    for (const item of items) {
      const vals = f.map(k => item[k] ?? null);
      const ph = f.map((_,i) => `$${i+1}`).join(',');
      const r = await pool.query(`INSERT INTO ${TABLE} (${f.join(',')}) VALUES (${ph}) RETURNING *`, vals);
      created.push(r.rows[0]);
    }
    res.status(201).json({ data: created, count: created.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 9. batch-update
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

// 10. batch-delete
router.delete('/batch', requireWriter, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'ids[] required' });
    const ph = ids.map((_,i) => `$${i+1}`).join(',');
    const r = await pool.query(`UPDATE ${TABLE} SET status = 'archived', updated_at = NOW() WHERE id IN (${ph}) RETURNING id`, ids);
    res.json({ updated: r.rowCount });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 11. count
router.get('/meta/count', async (req, res) => {
  try {
    const where = []; const vals = [];
    if (req.query.status) { vals.push(req.query.status); where.push(`status = $${vals.length}`); }
    const wClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const r = await pool.query(`SELECT COUNT(*) FROM ${TABLE} ${wClause}`, vals);
    res.json({ count: parseInt(r.rows[0].count) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 12. search
router.get('/meta/search', async (req, res) => {
  try {
    const q = `%${req.query.q || ''}%`;
    const r = await pool.query(`SELECT * FROM ${TABLE} WHERE notes ILIKE $1 OR eligibility_pathway ILIKE $1 OR state ILIKE $1 ORDER BY id DESC LIMIT 50`, [q]);
    res.json({ data: r.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 13. archive
router.post('/:id/archive', requireWriter, async (req, res) => {
  try {
    const r = await pool.query(`UPDATE ${TABLE} SET status = 'archived', updated_at = NOW() WHERE id = $1 RETURNING *`, [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ data: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 14. restore
router.post('/:id/restore', requireWriter, async (req, res) => {
  try {
    const r = await pool.query(`UPDATE ${TABLE} SET status = 'active', updated_at = NOW() WHERE id = $1 RETURNING *`, [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ data: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 15. history (audit log lookup)
router.get('/:id/history', async (req, res) => {
  try {
    const rec = await pool.query(`SELECT * FROM ${TABLE} WHERE id = $1`, [req.params.id]);
    if (!rec.rows.length) return res.status(404).json({ error: 'Not found' });
    const logs = await pool.query(`SELECT * FROM ai_results WHERE feature ILIKE '%medicaid%' ORDER BY id DESC LIMIT 50`);
    res.json({ data: logs.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 16. export-csv
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

// 17. import-csv
router.post('/meta/import-csv', requireWriter, async (req, res) => {
  try {
    const { csv } = req.body;
    if (!csv) return res.status(400).json({ error: 'csv field required' });
    const lines = csv.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return res.status(400).json({ error: 'Need header + 1 row' });
    const headers = lines[0].split(',').map(h => h.replace(/"/g,'').trim());
    const f = ['case_id','applicant_id','eligibility_pathway','magi_income','fpl_percentage','household_size','citizenship_status','immigration_status','five_year_bar_applies','state','program_type','determination_date','renewal_date','status','notes','ai_summary'];
    let inserted = 0;
    for (const line of lines.slice(1)) {
      const vals = (line.match(/(".*?"|[^,]+)/g) || []).map(v => v.replace(/^"|"$/g,'').replace(/""/g,'"'));
      const obj = {}; headers.forEach((h,i) => { obj[h] = vals[i] ?? null; });
      const cols = f.filter(k => obj[k] !== undefined);
      if (!cols.length) continue;
      const ph = cols.map((_,i) => `$${i+1}`).join(',');
      await pool.query(`INSERT INTO ${TABLE} (${cols.join(',')}) VALUES (${ph})`, cols.map(k => obj[k]));
      inserted++;
    }
    res.json({ inserted });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 18. stats-summary
router.get('/meta/stats-summary', async (req, res) => {
  try {
    const [byStatus, byPathway, byState] = await Promise.all([
      pool.query(`SELECT status, COUNT(*) as count FROM ${TABLE} GROUP BY status`),
      pool.query(`SELECT eligibility_pathway, COUNT(*) as count FROM ${TABLE} GROUP BY eligibility_pathway`),
      pool.query(`SELECT state, COUNT(*) as count FROM ${TABLE} GROUP BY state ORDER BY count DESC LIMIT 10`)
    ]);
    res.json({ byStatus: byStatus.rows, byPathway: byPathway.rows, byState: byState.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─────────────────────── AI verbs ────────────────────────────

async function loadRecord(id, res) {
  const r = await pool.query(`SELECT * FROM ${TABLE} WHERE id = $1`, [id]);
  if (!r.rows.length) { res.status(404).json({ error: 'Record not found' }); return null; }
  return r.rows[0];
}

router.post('/ai/classify-eligibility-pathway', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Classify the Medicaid eligibility pathway (MAGI expansion, MAGI parent/caretaker, Non-MAGI aged/blind/disabled, CHIP, Emergency Medicaid for non-citizens, etc.) for this applicant. Data: ${JSON.stringify(rec)}. Return JSON: {"pathway": string, "sub_pathway": string, "confidence": "high|medium|low", "rationale": string, "alternative_pathways": [string]}`), {});
    await pool.query('INSERT INTO ai_results (feature, input, output) VALUES ($1,$2,$3)', ['medicaid/classify-eligibility-pathway', rec, result]).catch(()=>{});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/calculate-magi', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Calculate the Modified Adjusted Gross Income (MAGI) for Medicaid eligibility. Data: ${JSON.stringify(rec)}. Return JSON: {"magi_calculated": number, "fpl_percentage": number, "fpl_threshold": number, "income_sources": [{"type": string, "amount": number}], "deductions_applied": [string], "eligible": boolean, "notes": string}`), {});
    await pool.query('INSERT INTO ai_results (feature, input, output) VALUES ($1,$2,$3)', ['medicaid/calculate-magi', rec, result]).catch(()=>{});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/detect-five-year-bar', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Determine whether the five-year bar on Medicaid for qualified immigrants applies. Consider lawful permanent resident date, refugee/asylee exceptions, PRUCOL status, CHIP exceptions, and state options to cover. Data: ${JSON.stringify(rec)}. Return JSON: {"five_year_bar_applies": boolean, "exception_category": string, "entry_date": string, "bar_expiry_date": string, "state_option_available": boolean, "rationale": string, "citations": [string]}`), {});
    await pool.query('INSERT INTO ai_results (feature, input, output) VALUES ($1,$2,$3)', ['medicaid/detect-five-year-bar', rec, result]).catch(()=>{});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/predict-renewal-risk', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Predict the risk that this Medicaid recipient will lose eligibility at renewal. Consider income changes, household changes, immigration status changes, state redetermination patterns. Data: ${JSON.stringify(rec)}. Return JSON: {"renewal_risk": "low|moderate|high", "risk_score": number, "risk_factors": [string], "protective_factors": [string], "recommended_actions": [string]}`), {});
    await pool.query('INSERT INTO ai_results (feature, input, output) VALUES ($1,$2,$3)', ['medicaid/predict-renewal-risk', rec, result]).catch(()=>{});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/suggest-additional-info-needed', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Identify what additional information or documentation is needed to complete this Medicaid eligibility determination. Data: ${JSON.stringify(rec)}. Return JSON: {"missing_documents": [{"document": string, "reason": string, "priority": "required|preferred"}], "missing_information": [string], "verification_sources": [string], "estimated_delay_days": number}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/generate-determination-narrative', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Generate a plain-language eligibility determination narrative for the caseworker file. Data: ${JSON.stringify(rec)}. Return JSON: {"narrative": string, "determination": "eligible|denied|pending", "basis": string, "effective_date": string, "program": string}`), {});
    if (rec.id) await pool.query(`UPDATE ${TABLE} SET ai_summary = $1 WHERE id = $2`, [result.narrative || '', rec.id]).catch(()=>{});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/summarize-case-history', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Summarize the Medicaid case history for this applicant, highlighting key events, determination dates, gaps, and renewals. Data: ${JSON.stringify(rec)}. Return JSON: {"summary": string, "key_events": [{"date": string, "event": string}], "coverage_gaps": [string], "current_status": string}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/score-app-completeness', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Score the completeness of this Medicaid application on a 0-100 scale. Data: ${JSON.stringify(rec)}. Return JSON: {"completeness_score": number, "complete_fields": [string], "incomplete_fields": [{"field": string, "impact": "blocking|minor"}], "recommendation": string}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/validate-income-vs-fpl', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Validate the income figure against federal poverty level thresholds for the applicable Medicaid category and household size. Data: ${JSON.stringify(rec)}. Return JSON: {"reported_income": number, "calculated_fpl_percent": number, "fpl_threshold_pct": number, "passes_income_test": boolean, "discrepancies": [string], "notes": string}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/recommend-program-alternative', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `If this applicant is ineligible for full Medicaid, recommend alternative programs (CHIP, ACA marketplace, Emergency Medicaid, state-funded programs, Ryan White, community health centers). Data: ${JSON.stringify(rec)}. Return JSON: {"alternatives": [{"program": string, "eligibility_likelihood": "high|medium|low", "rationale": string, "next_steps": string}]}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/classify-disability-category', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Classify the disability category for non-MAGI Medicaid eligibility purposes (SSI-linked, aged, blind, disabled, HCBS waiver). Data: ${JSON.stringify(rec)}. Return JSON: {"disability_category": string, "ssi_linked": boolean, "functional_criteria_met": boolean, "recommended_pathway": string, "documentation_needed": [string]}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/predict-eligibility-outcome', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Predict the likely Medicaid eligibility outcome for this application. Data: ${JSON.stringify(rec)}. Return JSON: {"predicted_outcome": "eligible|denied|pended", "confidence": number, "primary_basis": string, "risk_factors": [string], "supporting_factors": [string]}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/detect-fraud-indicator', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Identify any potential fraud indicators in this Medicaid application (income discrepancies, duplicate enrollment, unreported assets, identity issues). Data: ${JSON.stringify(rec)}. Return JSON: {"fraud_indicators": [{"indicator": string, "severity": "low|moderate|high", "recommended_action": string}], "overall_risk": "low|moderate|high"}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/generate-eligibility-letter', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Draft a formal Medicaid eligibility determination letter (approval or denial) meeting due process notice requirements. Data: ${JSON.stringify(rec)}. Return JSON: {"letter_text": string, "determination": "approved|denied|pended", "effective_date": string, "appeal_rights_included": boolean, "language": "plain"}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/suggest-presumptive-eligibility', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Assess whether this applicant qualifies for presumptive Medicaid eligibility while the full application is processed. Data: ${JSON.stringify(rec)}. Return JSON: {"presumptive_eligible": boolean, "basis": string, "duration_days": number, "qualified_entity_needed": boolean, "notes": string}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/score-policy-citation', aiRateLimit, async (req, res) => {
  try {
    const { question, context } = req.body;
    const result = safeJsonParse(await callOpenRouter(SYS, `Provide policy citations (42 CFR, SSA, CMCS guidance, state plan) for this Medicaid eligibility question. Question: ${question}. Context: ${JSON.stringify(context || {})}. Return JSON: {"citations": [{"source": string, "section": string, "text": string, "relevance": string}], "summary": string}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
