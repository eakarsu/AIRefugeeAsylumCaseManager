// Government Benefits — TANF Benefit Calculation
// 18 CRUD + 16 AI verbs
'use strict';

const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { requireWriter } = require('../middleware/auth');
const { callOpenRouter, safeJsonParse } = require('../services/ai');

const TABLE = 'benefit_tanf_calc';

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

const SYS = 'You are a senior TANF eligibility specialist with deep expertise in 42 USC 601-619, state TANF plans, work participation rate requirements, time limits (60-month federal, shorter state limits), sanctions, individual responsibility plans, domestic violence exceptions under the Family Violence Option, and refugee-specific TANF access (Refugee Cash Assistance, state options). Return strict JSON in the schema requested. Output is a decision-support aid, not a final agency determination.';

const FIELDS = ['case_id','applicant_id','household_size','number_of_children','benefit_amount','maximum_benefit','income_deduction','work_participation_status','months_on_tanf_federal','months_on_tanf_state','time_limit_federal_exhausted','time_limit_state_exhausted','sanction_level','sanction_reason','irp_status','domestic_violence_flag','immigration_status','state','status','notes','ai_summary'];

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
    const r = await pool.query(`SELECT * FROM ${TABLE} WHERE notes ILIKE $1 OR sanction_reason ILIKE $1 OR state ILIKE $1 ORDER BY id DESC LIMIT 50`, [q]);
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
    const logs = await pool.query(`SELECT * FROM ai_results WHERE feature ILIKE '%tanf%' ORDER BY id DESC LIMIT 50`);
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
    const [byStatus, bySanction, byState] = await Promise.all([
      pool.query(`SELECT status, COUNT(*) as count FROM ${TABLE} GROUP BY status`),
      pool.query(`SELECT sanction_level, COUNT(*) as count FROM ${TABLE} GROUP BY sanction_level`),
      pool.query(`SELECT state, COUNT(*) as count FROM ${TABLE} GROUP BY state ORDER BY count DESC LIMIT 10`)
    ]);
    res.json({ byStatus: byStatus.rows, bySanction: bySanction.rows, byState: byState.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─────────────────────── AI verbs ────────────────────────────

async function loadRecord(id, res) {
  const r = await pool.query(`SELECT * FROM ${TABLE} WHERE id = $1`, [id]);
  if (!r.rows.length) { res.status(404).json({ error: 'Record not found' }); return null; }
  return r.rows[0];
}

router.post('/ai/calculate-tanf-benefit', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Calculate the TANF benefit amount for this household after income deductions and sanctions. Data: ${JSON.stringify(rec)}. Return JSON: {"maximum_benefit": number, "income_deduction": number, "sanction_reduction": number, "calculated_benefit": number, "calculation_steps": [string], "state": string}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/classify-work-participation-rate', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Classify this TANF recipient's work participation rate status. Identify countable activities, hours, and whether the 50% all-families / 90% two-parent rate is being met. Data: ${JSON.stringify(rec)}. Return JSON: {"countable_activities": [string], "weekly_hours": number, "required_hours": number, "meets_requirement": boolean, "deficit_hours": number, "barriers_identified": [string]}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/detect-time-limit-exhaustion', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Detect whether this family has exhausted or is approaching TANF time limits (federal 60-month, state shorter limits). Consider exemptions (domestic violence, hardship, child-only cases). Data: ${JSON.stringify(rec)}. Return JSON: {"federal_months_used": number, "federal_months_remaining": number, "state_months_used": number, "state_months_remaining": number, "exhausted": boolean, "exemption_available": boolean, "exemption_category": string}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/predict-sanction-risk', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Predict the risk that this TANF recipient will face a work requirement sanction in the next 90 days. Data: ${JSON.stringify(rec)}. Return JSON: {"sanction_risk": "low|moderate|high", "risk_score": number, "risk_factors": [string], "recommended_interventions": [string], "good_cause_potential": boolean}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/suggest-good-cause-exception', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Identify whether good cause exists to excuse this TANF recipient from work requirements or sanction (domestic violence, disability, childcare unavailability, transportation). Data: ${JSON.stringify(rec)}. Return JSON: {"good_cause_exists": boolean, "good_cause_categories": [string], "documentation_needed": [string], "duration_months": number, "notes": string}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/generate-tanf-narrative', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Generate a plain-language TANF case narrative. Data: ${JSON.stringify(rec)}. Return JSON: {"narrative": string, "benefit_amount": number, "key_issues": [string], "next_steps": [string]}`), {});
    if (rec.id) await pool.query(`UPDATE ${TABLE} SET ai_summary = $1 WHERE id = $2`, [result.narrative || '', rec.id]).catch(()=>{});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/summarize-tanf-history', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Summarize this family's TANF benefit history including spells, sanctions, and time-limit usage. Data: ${JSON.stringify(rec)}. Return JSON: {"summary": string, "total_months": number, "sanction_history": [string], "gaps": [string]}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/score-work-activity-engagement', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Score this TANF recipient's engagement in work activities on a 0-100 scale. Data: ${JSON.stringify(rec)}. Return JSON: {"engagement_score": number, "activities_documented": [string], "hours_per_week": number, "barriers": [string], "recommendations": [string]}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/validate-irp', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Validate this Individual Responsibility Plan (IRP) for TANF compliance. Check goals, activities, timelines, and client signature requirements. Data: ${JSON.stringify(rec)}. Return JSON: {"irp_valid": boolean, "missing_elements": [string], "compliance_issues": [string], "recommended_revisions": [string]}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/recommend-conciliation', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Recommend a conciliation plan to resolve a TANF non-compliance before a sanction is imposed. Data: ${JSON.stringify(rec)}. Return JSON: {"conciliation_recommended": boolean, "conciliation_steps": [string], "timeline_days": number, "success_likelihood": "high|medium|low", "alternative_if_failed": string}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/classify-sanction-tier', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Classify the applicable TANF sanction tier (first, second, third offense; partial vs full family sanction) per state policy. Data: ${JSON.stringify(rec)}. Return JSON: {"sanction_tier": string, "reduction_type": "partial|full", "reduction_amount": number, "duration_months": number, "cure_requirements": [string]}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/predict-recidivism', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Predict the likelihood of this TANF family returning to assistance within 12 months of closure. Data: ${JSON.stringify(rec)}. Return JSON: {"recidivism_risk": "low|moderate|high", "risk_score": number, "risk_factors": [string], "protective_factors": [string], "recommended_exit_services": [string]}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/detect-domestic-violence-exception', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Assess whether the domestic violence/Family Violence Option exception should apply to waive work requirements or time limits for this TANF recipient. Data: ${JSON.stringify(rec)}. Return JSON: {"dv_exception_warranted": boolean, "fvo_state": boolean, "waiver_categories": [string], "safety_plan_needed": boolean, "documentation_approach": string, "confidentiality_protocol": string}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/generate-sanction-notice', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Draft a TANF sanction advance notice meeting adequate notice requirements. Data: ${JSON.stringify(rec)}. Return JSON: {"notice_text": string, "sanction_level": string, "effective_date": string, "cure_deadline": string, "appeal_rights": string, "good_cause_language": string}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/suggest-supportive-services', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Suggest supportive services to help this TANF family achieve self-sufficiency (childcare, transportation, job training, mental health, housing). Data: ${JSON.stringify(rec)}. Return JSON: {"services": [{"service": string, "provider": string, "rationale": string, "estimated_impact": string}], "priority_order": [string]}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/score-self-sufficiency-plan', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Score the quality and feasibility of this TANF family's self-sufficiency plan on a 0-100 scale. Data: ${JSON.stringify(rec)}. Return JSON: {"plan_score": number, "strengths": [string], "weaknesses": [string], "feasibility": "high|medium|low", "recommended_improvements": [string]}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
