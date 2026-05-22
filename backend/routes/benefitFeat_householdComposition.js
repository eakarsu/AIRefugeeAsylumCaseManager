// Government Benefits — Household Composition
// 18 CRUD + 16 AI verbs
'use strict';

const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { requireWriter } = require('../middleware/auth');
const { callOpenRouter, safeJsonParse } = require('../services/ai');

const TABLE = 'benefit_household_composition';

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

const SYS = 'You are a senior household composition analyst for government benefits programs (Medicaid, SNAP, TANF, SSI). You have expertise in SNAP household membership rules (economic unit, separate household, boarder/roomer), Medicaid MAGI tax dependency rules, TANF assistance unit composition, SSI eligible-individual rules, pregnancy status rules, non-citizen inclusion/exclusion, and composition disputes. Return strict JSON in the schema requested. Output is a decision-support aid, not a final agency determination.';

const FIELDS = ['case_id','primary_applicant_id','household_members','household_size','snap_unit_size','medicaid_unit_size','tanf_unit_size','shared_living_arrangement','tax_filer_status','pregnancy_status','non_citizen_members','composition_dispute','state','status','notes','ai_summary'];

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
    const r = await pool.query(`SELECT * FROM ${TABLE} WHERE primary_applicant_id = $1 ORDER BY id DESC`, [req.params.applicant_id]);
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
    const r = await pool.query(`SELECT * FROM ${TABLE} WHERE notes ILIKE $1 OR state ILIKE $1 ORDER BY id DESC LIMIT 50`, [q]);
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
    const logs = await pool.query(`SELECT * FROM ai_results WHERE feature ILIKE '%household%' ORDER BY id DESC LIMIT 50`);
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
    const [byState, byStatus, byPregnancy] = await Promise.all([
      pool.query(`SELECT state, COUNT(*) as count FROM ${TABLE} GROUP BY state ORDER BY count DESC LIMIT 10`),
      pool.query(`SELECT status, COUNT(*) as count FROM ${TABLE} GROUP BY status`),
      pool.query(`SELECT pregnancy_status, COUNT(*) as count FROM ${TABLE} GROUP BY pregnancy_status`)
    ]);
    res.json({ byState: byState.rows, byStatus: byStatus.rows, byPregnancy: byPregnancy.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─────────────────────── AI verbs ────────────────────────────

async function loadRecord(id, res) {
  const r = await pool.query(`SELECT * FROM ${TABLE} WHERE id = $1`, [id]);
  if (!r.rows.length) { res.status(404).json({ error: 'Record not found' }); return null; }
  return r.rows[0];
}

router.post('/ai/classify-household-membership', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Classify each household member's inclusion or exclusion from the SNAP/Medicaid/TANF assistance unit. Data: ${JSON.stringify(rec)}. Return JSON: {"members": [{"name": string, "relationship": string, "snap_included": boolean, "medicaid_included": boolean, "tanf_included": boolean, "exclusion_reason": string}], "snap_unit_size": number, "medicaid_unit_size": number, "tanf_unit_size": number}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/detect-shared-living-arrangement', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Detect whether this is a shared living arrangement (SLA) for SSI purposes and determine ISM implications. Data: ${JSON.stringify(rec)}. Return JSON: {"shared_living_arrangement": boolean, "ism_applies": boolean, "ism_type": "VTR|PMV|none", "pmv_amount": number, "impact_on_ssi": number, "documentation_needed": [string]}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/predict-household-change', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Predict likely household composition changes in the next 6 months and their impact on benefits. Data: ${JSON.stringify(rec)}. Return JSON: {"predicted_changes": [{"change": string, "likelihood": "high|medium|low", "benefit_impact": string}], "recommended_actions": [string]}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/suggest-separate-household', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Assess whether certain household members could form a separate SNAP/benefits household and whether that would be advantageous. Data: ${JSON.stringify(rec)}. Return JSON: {"separate_household_possible": boolean, "eligible_members": [string], "benefit_comparison": {"combined": number, "separate": number}, "documentation_needed": [string], "recommended": boolean}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/generate-composition-narrative', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Generate a clear household composition narrative for the case record. Data: ${JSON.stringify(rec)}. Return JSON: {"narrative": string, "assistance_unit_summary": string, "key_determinations": [string]}`), {});
    if (rec.id) await pool.query(`UPDATE ${TABLE} SET ai_summary = $1 WHERE id = $2`, [result.narrative || '', rec.id]).catch(()=>{});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/summarize-composition-history', aiRateLimit, async (req, res) => {
  try {
    const data = req.body;
    const result = safeJsonParse(await callOpenRouter(SYS, `Summarize the household composition history and how changes have affected benefits. Data: ${JSON.stringify(data)}. Return JSON: {"summary": string, "composition_changes": [{"date": string, "change": string, "benefit_impact": string}], "current_status": string}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/validate-tax-dependency', aiRateLimit, async (req, res) => {
  try {
    const data = req.body;
    const result = safeJsonParse(await callOpenRouter(SYS, `Validate tax dependency relationships for Medicaid MAGI household composition rules. Data: ${JSON.stringify(data)}. Return JSON: {"tax_filer": string, "dependents": [{"name": string, "qualifies_as_dependent": boolean, "relationship": string}], "medicaid_household_composition": [string], "aca_tax_rule_applied": boolean}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/recommend-snap-vs-medicaid-household', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Explain the differences between the SNAP household (economic unit) and Medicaid household (tax dependency) for this family and identify any discrepancies. Data: ${JSON.stringify(rec)}. Return JSON: {"snap_household": [string], "medicaid_household": [string], "discrepancies": [string], "recommendation": string, "optimization_strategy": string}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/classify-non-citizen-member', aiRateLimit, async (req, res) => {
  try {
    const data = req.body;
    const result = safeJsonParse(await callOpenRouter(SYS, `Classify each non-citizen household member's immigration status for benefits inclusion/exclusion purposes. Data: ${JSON.stringify(data)}. Return JSON: {"members": [{"name": string, "immigration_status": string, "qualified_immigrant": boolean, "snap_eligible": boolean, "medicaid_eligible": boolean, "five_year_bar": boolean, "exception_applies": boolean, "notes": string}]}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/predict-composition-dispute', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Predict the likelihood of a household composition dispute at verification and recommend preemptive documentation. Data: ${JSON.stringify(rec)}. Return JSON: {"dispute_risk": "low|moderate|high", "risk_factors": [string], "preemptive_documents": [string], "recommended_interview_questions": [string]}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/detect-living-with-relative', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Detect whether this applicant is living with relatives and assess the impact on SNAP separate household rules and SSI ISM. Data: ${JSON.stringify(rec)}. Return JSON: {"living_with_relative": boolean, "relative_relationship": string, "separate_household_established": boolean, "ism_impact": string, "prorating_needed": boolean}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/generate-household-affidavit', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Draft a household composition affidavit for the applicant to sign, documenting all household members and living arrangements. Data: ${JSON.stringify(rec)}. Return JSON: {"affidavit_text": string, "members_listed": [string], "signature_blocks": number, "notarization_required": boolean}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/score-composition-clarity', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Score the clarity and completeness of this household composition determination on a 0-100 scale. Data: ${JSON.stringify(rec)}. Return JSON: {"clarity_score": number, "clear_elements": [string], "unclear_elements": [string], "recommended_documentation": [string]}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/suggest-evidence-of-separate-household', aiRateLimit, async (req, res) => {
  try {
    const data = req.body;
    const result = safeJsonParse(await callOpenRouter(SYS, `Suggest evidence to establish a separate household for SNAP purposes when living with others. Data: ${JSON.stringify(data)}. Return JSON: {"evidence_types": [{"document": string, "purpose": string, "strength": "strong|moderate|weak"}], "interview_questions": [string], "affidavit_needed": boolean}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/validate-dependent-care', aiRateLimit, async (req, res) => {
  try {
    const data = req.body;
    const result = safeJsonParse(await callOpenRouter(SYS, `Validate dependent care expenses for SNAP and Medicaid deduction purposes. Data: ${JSON.stringify(data)}. Return JSON: {"dependent_care_verified": boolean, "monthly_expense": number, "allowable_deduction": number, "documentation_provided": [string], "documentation_needed": [string]}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/classify-pregnancy-status', aiRateLimit, async (req, res) => {
  try {
    const data = req.body;
    const result = safeJsonParse(await callOpenRouter(SYS, `Classify pregnancy status for benefits eligibility purposes (Medicaid pregnancy coverage, TANF newborn additions, SNAP unborn child). Data: ${JSON.stringify(data)}. Return JSON: {"pregnant": boolean, "due_date": string, "medicaid_pregnancy_eligible": boolean, "postpartum_period_end": string, "snap_unborn_counted": boolean, "tanf_newborn_add_date": string}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
