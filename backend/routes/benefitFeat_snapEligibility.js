// Government Benefits — SNAP Eligibility
// 18 CRUD + 16 AI verbs
'use strict';

const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { requireWriter } = require('../middleware/auth');
const { callOpenRouter, safeJsonParse } = require('../services/ai');

const TABLE = 'benefit_snap_eligibility';

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

const SYS = 'You are a senior SNAP eligibility specialist with expertise in 7 USC 2011, 7 CFR Part 273, gross/net income tests, standard deductions, excess shelter deduction, earned income deduction, ABAWD rules, categorical eligibility, and refugee-specific SNAP access rules. Return strict JSON in the schema requested. Output is a decision-support aid, not a final agency determination.';

const FIELDS = ['case_id','applicant_id','household_size','gross_monthly_income','net_monthly_income','gross_income_limit','net_income_limit','standard_deduction','earned_income_deduction','dependent_care_deduction','shelter_deduction','medical_deduction','abawd_status','categorical_eligibility','immigration_status','state','benefit_amount','certification_period_end','status','notes','ai_summary'];

// 1. list
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
    const vals = FIELDS.map(k => req.body[k] ?? null);
    const ph = FIELDS.map((_,i) => `$${i+1}`).join(',');
    const r = await pool.query(`INSERT INTO ${TABLE} (${FIELDS.join(',')}) VALUES (${ph}) RETURNING *`, vals);
    res.status(201).json({ data: r.rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 4. update
router.put('/:id', requireWriter, async (req, res) => {
  try {
    const sets = FIELDS.map((k,i) => `${k} = $${i+1}`).join(', ');
    const vals = [...FIELDS.map(k => req.body[k] ?? null), req.params.id];
    const r = await pool.query(`UPDATE ${TABLE} SET ${sets}, updated_at = NOW() WHERE id = $${FIELDS.length+1} RETURNING *`, vals);
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
    const r = await pool.query(`SELECT * FROM ${TABLE} WHERE notes ILIKE $1 OR state ILIKE $1 OR immigration_status ILIKE $1 ORDER BY id DESC LIMIT 50`, [q]);
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

// 15. history
router.get('/:id/history', async (req, res) => {
  try {
    const rec = await pool.query(`SELECT * FROM ${TABLE} WHERE id = $1`, [req.params.id]);
    if (!rec.rows.length) return res.status(404).json({ error: 'Not found' });
    const logs = await pool.query(`SELECT * FROM ai_results WHERE feature ILIKE '%snap%' ORDER BY id DESC LIMIT 50`);
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

// 18. stats-summary
router.get('/meta/stats-summary', async (req, res) => {
  try {
    const [byStatus, byState, byAbawd] = await Promise.all([
      pool.query(`SELECT status, COUNT(*) as count FROM ${TABLE} GROUP BY status`),
      pool.query(`SELECT state, COUNT(*) as count FROM ${TABLE} GROUP BY state ORDER BY count DESC LIMIT 10`),
      pool.query(`SELECT abawd_status, COUNT(*) as count FROM ${TABLE} GROUP BY abawd_status`)
    ]);
    res.json({ byStatus: byStatus.rows, byState: byState.rows, byAbawd: byAbawd.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─────────────────────── AI verbs ────────────────────────────

async function loadRecord(id, res) {
  const r = await pool.query(`SELECT * FROM ${TABLE} WHERE id = $1`, [id]);
  if (!r.rows.length) { res.status(404).json({ error: 'Record not found' }); return null; }
  return r.rows[0];
}

router.post('/ai/calculate-gross-income', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Calculate SNAP gross monthly income for this household. Include all countable income sources. Data: ${JSON.stringify(rec)}. Return JSON: {"gross_monthly_income": number, "income_sources": [{"type": string, "amount": number, "countable": boolean}], "gross_income_limit": number, "passes_gross_test": boolean}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/calculate-net-income', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Calculate SNAP net monthly income after all allowable deductions. Data: ${JSON.stringify(rec)}. Return JSON: {"gross_income": number, "standard_deduction": number, "earned_income_deduction": number, "dependent_care_deduction": number, "excess_shelter_deduction": number, "medical_deduction": number, "net_income": number, "net_income_limit": number, "passes_net_test": boolean}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/classify-deduction', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Classify all applicable SNAP deductions for this household (standard, earned income 20%, dependent care, excess shelter, medical for elderly/disabled). Data: ${JSON.stringify(rec)}. Return JSON: {"deductions": [{"type": string, "amount": number, "basis": string, "documentation_needed": string}], "total_deductions": number}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/detect-able-bodied-adult-without-dependents-status', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Determine ABAWD (Able-Bodied Adult Without Dependents) status and applicable time limits for this SNAP applicant. Consider refugee exemption (first 7 years), work requirement waivers, good cause exemptions. Data: ${JSON.stringify(rec)}. Return JSON: {"is_abawd": boolean, "exemption_applies": boolean, "exemption_category": string, "months_counted": number, "months_remaining": number, "work_requirement": string, "refugee_exemption_applies": boolean}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/predict-allotment', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Predict the monthly SNAP allotment for this household using the standard benefit formula (30% of net income subtracted from maximum allotment). Data: ${JSON.stringify(rec)}. Return JSON: {"max_allotment": number, "thirty_pct_net": number, "predicted_allotment": number, "household_size": number, "calculation_steps": [string]}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/suggest-additional-deductions', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Identify additional SNAP deductions the household may be eligible for but hasn't claimed. Data: ${JSON.stringify(rec)}. Return JSON: {"unclaimed_deductions": [{"deduction": string, "estimated_amount": number, "eligibility_basis": string, "documents_needed": [string]}], "potential_additional_benefit": number}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/generate-snap-narrative', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Generate a plain-language SNAP eligibility narrative for the case record. Data: ${JSON.stringify(rec)}. Return JSON: {"narrative": string, "determination": "eligible|denied|pended", "monthly_benefit": number, "certification_period": string}`), {});
    if (rec.id) await pool.query(`UPDATE ${TABLE} SET ai_summary = $1 WHERE id = $2`, [result.narrative || '', rec.id]).catch(()=>{});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/summarize-household-snap-history', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Summarize the household's SNAP benefit history, including any gaps, changes in allotment, and recertification history. Data: ${JSON.stringify(rec)}. Return JSON: {"summary": string, "benefit_history": [{"period": string, "amount": number, "notes": string}], "total_months_certified": number}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/validate-shelter-cost', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Validate the shelter cost claim for excess shelter deduction eligibility. Check rent, utilities, homeless shelter costs, and standard utility allowance. Data: ${JSON.stringify(rec)}. Return JSON: {"reported_shelter_cost": number, "standard_utility_allowance": number, "excess_shelter_amount": number, "capped_at_max": boolean, "documentation_required": [string], "valid": boolean}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/recommend-recertification-timing', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Recommend the optimal recertification timing for this SNAP case, considering income stability, household changes, and state policies. Data: ${JSON.stringify(rec)}. Return JSON: {"recommended_cert_period_months": number, "rationale": string, "recert_due_date": string, "outreach_date": string, "risk_of_lapse": "low|moderate|high"}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/classify-special-population', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Classify any SNAP special population designations (elderly, disabled, refugee within 7-year window, trafficking survivor, homeless, migrant). Data: ${JSON.stringify(rec)}. Return JSON: {"special_population_categories": [string], "enhanced_benefits_applicable": boolean, "categorical_eligibility": boolean, "notes": string}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/predict-benefit-change', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Predict how upcoming life changes (employment, household member departure, income increase) will affect this household's SNAP benefit. Data: ${JSON.stringify(rec)}. Return JSON: {"current_benefit": number, "predicted_benefit": number, "change_driver": string, "effective_date": string, "should_report_change": boolean}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/detect-overissuance', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Detect potential SNAP overissuance (benefits issued in excess of entitlement) for this case. Data: ${JSON.stringify(rec)}. Return JSON: {"overissuance_detected": boolean, "estimated_amount": number, "period": string, "cause": string, "agency_error_vs_client_error": string, "recommended_action": string}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/generate-overissuance-notice', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Draft a SNAP overissuance claim notice meeting federal due process requirements. Data: ${JSON.stringify(rec)}. Return JSON: {"notice_text": string, "claim_amount": number, "repayment_options": [string], "appeal_rights": string, "waiver_eligibility": boolean}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/score-budget-accuracy', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Score the accuracy of the SNAP budget calculation for this case on a 0-100 scale. Flag any errors or omissions. Data: ${JSON.stringify(rec)}. Return JSON: {"accuracy_score": number, "errors": [{"field": string, "issue": string}], "omissions": [string], "corrected_benefit": number}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/suggest-categorical-eligibility', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Determine whether categorical eligibility (broad-based or standard) applies to this SNAP household based on TANF/MOE program participation. Data: ${JSON.stringify(rec)}. Return JSON: {"categorical_eligible": boolean, "type": "broad-based|standard|none", "basis": string, "gross_test_waived": boolean, "asset_test_waived": boolean, "state_option": boolean}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
