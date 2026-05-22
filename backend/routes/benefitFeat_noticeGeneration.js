// Government Benefits — Notice Generation
// 18 CRUD + 16 AI verbs
'use strict';

const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { requireWriter } = require('../middleware/auth');
const { callOpenRouter, safeJsonParse } = require('../services/ai');

const TABLE = 'benefit_notice_generation';

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

const SYS = 'You are a senior government benefits notice specialist with expertise in due process notice requirements (Goldberg v. Kelly, 14th Amendment), federal notice regulations (45 CFR 205.10, 7 CFR 273.13), adequate notice standards (timely, specific, plain language), appeal rights language, ADA-compliant notices, translation requirements (LEP Executive Order 13166), and plain writing standards. Return strict JSON in the schema requested. Output is a decision-support aid, not a final agency determination.';

const FIELDS = ['case_id','applicant_id','notice_type','program','determination','effective_date','denial_reasons','appeal_deadline','appeal_deadline_date','hearing_rights','notice_text','language','translation_required','sent_date','delivery_method','procedural_defects','status','notes','ai_summary'];

// ── CRUD ─────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const where = []; const vals = [];
    if (req.query.case_id) { vals.push(req.query.case_id); where.push(`case_id = $${vals.length}`); }
    if (req.query.notice_type) { vals.push(req.query.notice_type); where.push(`notice_type = $${vals.length}`); }
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
    const r = await pool.query(`SELECT * FROM ${TABLE} WHERE notes ILIKE $1 OR notice_type ILIKE $1 OR program ILIKE $1 ORDER BY id DESC LIMIT 50`, [q]);
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
    const logs = await pool.query(`SELECT * FROM ai_results WHERE feature ILIKE '%notice%' ORDER BY id DESC LIMIT 50`);
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
    const [byType, byProgram, byStatus] = await Promise.all([
      pool.query(`SELECT notice_type, COUNT(*) as count FROM ${TABLE} GROUP BY notice_type`),
      pool.query(`SELECT program, COUNT(*) as count FROM ${TABLE} GROUP BY program`),
      pool.query(`SELECT status, COUNT(*) as count FROM ${TABLE} GROUP BY status`)
    ]);
    res.json({ byType: byType.rows, byProgram: byProgram.rows, byStatus: byStatus.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─────────────────────── AI verbs ────────────────────────────

async function loadRecord(id, res) {
  const r = await pool.query(`SELECT * FROM ${TABLE} WHERE id = $1`, [id]);
  if (!r.rows.length) { res.status(404).json({ error: 'Record not found' }); return null; }
  return r.rows[0];
}

router.post('/ai/classify-notice-type', aiRateLimit, async (req, res) => {
  try {
    const data = req.body;
    const result = safeJsonParse(await callOpenRouter(SYS, `Classify the type of benefits notice required for this action (advance notice, adverse action notice, approval notice, termination notice, overissuance notice, fair hearing decision). Data: ${JSON.stringify(data)}. Return JSON: {"notice_type": string, "advance_notice_days_required": number, "timely_notice_required": boolean, "regulatory_basis": string}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/draft-eligibility-determination-notice', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Draft a complete eligibility determination notice (approval). Include all required elements: determination, effective date, benefit amount, household composition used, income/assets counted, renewal information, and contact information. Data: ${JSON.stringify(rec)}. Return JSON: {"notice_text": string, "elements_included": [string], "effective_date": string, "benefit_amount": number}`), {});
    if (rec.id) await pool.query(`UPDATE ${TABLE} SET notice_text = $1, ai_summary = $2 WHERE id = $3`, [result.notice_text || '', 'AI-drafted eligibility notice', rec.id]).catch(()=>{});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/draft-denial-notice', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Draft a denial notice meeting all due process requirements. Include specific denial reason, regulatory citation, factual basis, appeal rights (time limit, how to request, right to aid pending), and plain language. Data: ${JSON.stringify(rec)}. Return JSON: {"notice_text": string, "denial_reason": string, "citation": string, "appeal_deadline_days": number, "aid_pending_available": boolean, "plain_language_grade_level": number}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/draft-termination-notice', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Draft a benefits termination advance notice with all required elements: reason, effective date, right to request fair hearing, aid-continuing rights, and regulatory citations. Data: ${JSON.stringify(rec)}. Return JSON: {"notice_text": string, "termination_reason": string, "effective_date": string, "advance_notice_days": number, "aid_pending_right": boolean, "citation": string}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/draft-overissuance-notice', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Draft an overissuance/claim notice with repayment options, waiver eligibility, and appeal rights. Data: ${JSON.stringify(rec)}. Return JSON: {"notice_text": string, "claim_amount": number, "claim_period": string, "cause": "agency_error|inadvertent_household_error|fraud", "repayment_options": [string], "waiver_option": boolean, "appeal_rights": string}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/classify-good-cause', aiRateLimit, async (req, res) => {
  try {
    const data = req.body;
    const result = safeJsonParse(await callOpenRouter(SYS, `Classify whether good cause exists to excuse a missed deadline or non-compliance for benefits purposes. Data: ${JSON.stringify(data)}. Return JSON: {"good_cause_exists": boolean, "category": string, "regulatory_basis": string, "documentation_needed": [string], "duration_applicable": string}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/generate-due-process-language', aiRateLimit, async (req, res) => {
  try {
    const data = req.body;
    const result = safeJsonParse(await callOpenRouter(SYS, `Generate compliant due process language for a benefits notice, including hearing request procedure, aid-pending rights, representation rights, and evidence submission. Data: ${JSON.stringify(data)}. Return JSON: {"due_process_paragraph": string, "appeal_deadline_days": number, "hearing_request_method": string, "aid_continuing_available": boolean, "representation_language": string}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/validate-notice-completeness', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Validate whether this notice contains all federally required elements and meets due process standards. Data: ${JSON.stringify(rec)}. Return JSON: {"complete": boolean, "missing_elements": [string], "procedural_defects": [string], "compliance_score": number, "remediation": [string]}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/suggest-citation', aiRateLimit, async (req, res) => {
  try {
    const data = req.body;
    const result = safeJsonParse(await callOpenRouter(SYS, `Suggest appropriate regulatory citations for this benefits notice based on the action type and program. Data: ${JSON.stringify(data)}. Return JSON: {"citations": [{"regulation": string, "section": string, "relevance": string}], "primary_citation": string}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/classify-action-level-impact', aiRateLimit, async (req, res) => {
  try {
    const data = req.body;
    const result = safeJsonParse(await callOpenRouter(SYS, `Classify the impact level of this benefits action on the household (adverse/reduction/termination/approval) and determine notice timing requirements. Data: ${JSON.stringify(data)}. Return JSON: {"action_type": string, "impact_level": "adverse|neutral|positive", "advance_notice_days": number, "timely_notice_date": string, "aid_pending_right": boolean}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/predict-appeal-likelihood', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Predict the likelihood that this notice recipient will file an appeal based on action type, amount, and case history. Data: ${JSON.stringify(rec)}. Return JSON: {"appeal_likelihood": "low|moderate|high", "estimated_probability": number, "drivers": [string], "recommended_notice_improvements": [string]}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/summarize-notice-history', aiRateLimit, async (req, res) => {
  try {
    const data = req.body;
    const result = safeJsonParse(await callOpenRouter(SYS, `Summarize the notice history for this benefits case. Data: ${JSON.stringify(data)}. Return JSON: {"summary": string, "notices_sent": [{"date": string, "type": string, "outcome": string}], "procedural_defects_identified": [string]}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/score-notice-clarity', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Score the clarity of this benefits notice on a 0-100 scale using plain language criteria. Data: ${JSON.stringify(rec)}. Return JSON: {"clarity_score": number, "reading_grade_level": number, "jargon_terms": [string], "unclear_sections": [string], "improvement_suggestions": [string]}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/recommend-translation-language', aiRateLimit, async (req, res) => {
  try {
    const data = req.body;
    const result = safeJsonParse(await callOpenRouter(SYS, `Recommend the language(s) into which this notice must be translated based on LEP requirements, state thresholds, and the recipient's language. Data: ${JSON.stringify(data)}. Return JSON: {"primary_language_needed": string, "additional_languages": [string], "safe_harbor_threshold_met": boolean, "legal_requirement": string, "oral_interpretation_needed": boolean}`), {});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/detect-procedural-defect', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Identify procedural defects in this notice that could invalidate the agency action (late notice, missing elements, wrong appeal period, missing translation). Data: ${JSON.stringify(rec)}. Return JSON: {"defects": [{"type": string, "severity": "critical|moderate|minor", "legal_consequence": string, "remedy": string}], "action_voidable": boolean}`), {});
    if (rec.id) await pool.query(`UPDATE ${TABLE} SET procedural_defects = $1 WHERE id = $2`, [JSON.stringify(result.defects || []), rec.id]).catch(()=>{});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/ai/generate-plain-language-version', aiRateLimit, async (req, res) => {
  try {
    const rec = req.body.id ? await loadRecord(req.body.id, res) : req.body;
    if (!rec) return;
    const result = safeJsonParse(await callOpenRouter(SYS, `Rewrite this benefits notice in plain language at a 6th grade reading level while preserving all legal content and required elements. Data: ${JSON.stringify(rec)}. Return JSON: {"plain_language_notice": string, "grade_level": number, "changes_made": [string], "legal_content_preserved": boolean}`), {});
    if (rec.id) await pool.query(`UPDATE ${TABLE} SET ai_summary = $1 WHERE id = $2`, ['Plain language version generated', rec.id]).catch(()=>{});
    res.json({ success: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
