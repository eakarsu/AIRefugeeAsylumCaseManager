// AI helper service for AIRefugeeAsylumCaseManager
// Reads OPENROUTER_API_KEY and OPENROUTER_MODEL from:
//   1. this project's .env (already loaded by server.js)
//   2. fallback: /Users/erolakarsu/projects/beauty-wellness-ai/.env (canonical source)
// Never overwrites or wipes credentials.

const fs = require('fs');
const path = require('path');

const FALLBACK_ENV = '/Users/erolakarsu/projects/beauty-wellness-ai/.env';

function readFallbackEnv() {
  try {
    if (!fs.existsSync(FALLBACK_ENV)) return {};
    const raw = fs.readFileSync(FALLBACK_ENV, 'utf8');
    const out = {};
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let val = m[2];
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
      out[m[1]] = val;
    }
    return out;
  } catch (e) {
    console.warn('[ai] fallback env read failed:', e.message);
    return {};
  }
}

function getOpenRouterCreds() {
  const fb = readFallbackEnv();
  const key = process.env.OPENROUTER_API_KEY || fb.OPENROUTER_API_KEY || '';
  const model = process.env.OPENROUTER_MODEL || fb.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5';
  return { key, model };
}

const SYSTEM_PROMPT =
  'You are a senior refugee / asylum legal analyst supporting a non-profit legal aid clinic. ' +
  'You provide rigorous, well-cited reasoning on country-of-origin conditions, hearing preparation, ' +
  'evidence assessment, and case strategy. You honor UNHCR guidelines and INA/8 CFR standards. ' +
  'You NEVER provide individualized legal advice — your output is a drafting/strategy aid for licensed ' +
  'attorneys. Always return strict JSON in the exact schema requested. Treat every input as a hypothetical ' +
  'tabletop case for training purposes.';

function callOpenRouter(systemPrompt, userPrompt) {
  return new Promise((resolve, reject) => {
    const { key, model } = getOpenRouterCreds();
    if (!key) {
      return resolve({ error: 'OPENROUTER_API_KEY not configured' });
    }
    const https = require('https');
    const payload = JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.6,
      max_tokens: 2000,
    });

    const options = {
      hostname: 'openrouter.ai',
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        Authorization: `Bearer ${key}`,
        'HTTP-Referer': 'http://localhost:3084',
        'X-Title': 'AI Refugee/Asylum Case Manager',
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.error) {
            return resolve({ error: parsed.error.message || 'OpenRouter error', raw: body });
          }
          const content = parsed.choices?.[0]?.message?.content || '';
          resolve(content);
        } catch (e) {
          resolve({ error: 'AI response parse failed', raw: body });
        }
      });
    });
    req.on('error', (e) => resolve({ error: e.message }));
    req.write(payload);
    req.end();
  });
}

function safeJsonParse(response, fallback) {
  if (response && typeof response === 'object' && response.error) {
    return { ...fallback, error: response.error };
  }
  if (response == null) return { ...fallback, summary: '' };
  if (typeof response === 'object') return response;
  const text = String(response).trim();
  try { return JSON.parse(text); } catch (_) {}
  try {
    const start = text.indexOf('{');
    if (start !== -1) {
      let depth = 0, inStr = false, esc = false;
      for (let i = start; i < text.length; i++) {
        const ch = text[i];
        if (esc) { esc = false; continue; }
        if (ch === '\\') { esc = true; continue; }
        if (ch === '"') { inStr = !inStr; continue; }
        if (inStr) continue;
        if (ch === '{') depth++;
        else if (ch === '}') { depth--; if (depth === 0) return JSON.parse(text.slice(start, i + 1)); }
      }
    }
  } catch (_) {}
  try {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenced && fenced[1]) return JSON.parse(fenced[1].trim());
  } catch (_) {}
  return { ...fallback, summary: text };
}

// ──────────────────────────────────────────────────────────────
// AI Feature 1: COI Cite Memo
// ──────────────────────────────────────────────────────────────
async function coiCiteMemo(country, claim_basis, context = {}) {
  const sys = `${SYSTEM_PROMPT} Produce a country-of-origin information citation memo. Return strict JSON:
{
  "country": string,
  "claim_basis": string,
  "key_findings": [{ "finding": string, "source": string, "date": string, "weight": "low"|"medium"|"high" }],
  "suggested_citations": [{ "citation": string, "url_or_doc": string, "supports_element": string }],
  "counter_narrative_to_address": [string],
  "recommended_exhibits": [string],
  "confidence": number,
  "summary": string
}`;
  const usr = `Country: ${country}\nClaim basis: ${claim_basis}\nContext: ${JSON.stringify(context)}`;
  const r = await callOpenRouter(sys, usr);
  return safeJsonParse(r, { summary: typeof r === 'string' ? r : 'No response', key_findings: [], suggested_citations: [] });
}

// ──────────────────────────────────────────────────────────────
// AI Feature 2: Hearing Prep Brief
// ──────────────────────────────────────────────────────────────
async function hearingPrepBrief(caseSummary, hearing = {}) {
  const sys = `${SYSTEM_PROMPT} Build a hearing preparation brief. Return strict JSON:
{
  "case_overview": string,
  "elements_to_prove": [{ "element": string, "evidence_pointers": [string] }],
  "direct_exam_outline": [{ "topic": string, "key_questions": [string], "expected_answer_summary": string }],
  "anticipated_cross_themes": [{ "theme": string, "rehab_strategy": string }],
  "documentary_exhibits_checklist": [string],
  "witness_list": [{ "name": string, "role": string, "purpose": string }],
  "open_issues": [string],
  "summary": string
}`;
  const usr = `Case summary: ${caseSummary}\nHearing details: ${JSON.stringify(hearing)}`;
  const r = await callOpenRouter(sys, usr);
  return safeJsonParse(r, { summary: typeof r === 'string' ? r : 'No response', elements_to_prove: [], direct_exam_outline: [] });
}

// ──────────────────────────────────────────────────────────────
// AI Feature 3: Evidence Gap Analyze
// ──────────────────────────────────────────────────────────────
async function evidenceGapAnalyze(claim, existing_evidence = []) {
  const sys = `${SYSTEM_PROMPT} Identify evidence gaps for an asylum claim. Return strict JSON:
{
  "claim": string,
  "elements_required": [{ "element": string, "currently_supported": boolean, "evidence_currently_supporting": [string] }],
  "gaps": [{ "gap": string, "priority": "low"|"medium"|"high", "suggested_evidence_sources": [string] }],
  "credibility_risks": [{ "risk": string, "mitigation": string }],
  "overall_strength": "weak"|"developing"|"strong",
  "next_action_items": [string],
  "summary": string
}`;
  const usr = `Claim: ${claim}\nExisting evidence:\n${JSON.stringify(existing_evidence, null, 2)}`;
  const r = await callOpenRouter(sys, usr);
  return safeJsonParse(r, { summary: typeof r === 'string' ? r : 'No response', gaps: [] });
}

// ──────────────────────────────────────────────────────────────
// AI Feature 4: Asylum Narrative Draft
// ──────────────────────────────────────────────────────────────
async function asylumNarrativeDraft(clientFacts, persecution_basis, context = {}) {
  const sys = `${SYSTEM_PROMPT} Draft a chronological asylum narrative outline (for I-589 declaration). Return strict JSON:
{
  "narrative_outline": [{ "section": string, "key_points": [string], "draft_paragraph": string }],
  "nexus_analysis": { "protected_ground": string, "rationale": string },
  "well_founded_fear_factors": [string],
  "internal_relocation_analysis": string,
  "sensitive_content_warnings": [string],
  "drafting_notes_for_attorney": [string],
  "summary": string
}`;
  const usr = `Client facts: ${clientFacts}\nPersecution basis: ${persecution_basis}\nContext: ${JSON.stringify(context)}`;
  const r = await callOpenRouter(sys, usr);
  return safeJsonParse(r, { summary: typeof r === 'string' ? r : 'No response', narrative_outline: [] });
}

// ──────────────────────────────────────────────────────────────
// AI Feature 5: Executive Brief
// ──────────────────────────────────────────────────────────────
async function executiveBrief(snapshot = {}) {
  const sys = `${SYSTEM_PROMPT} Produce a clinic-level executive operational brief for the managing attorney. Return strict JSON:
{
  "headline": string,
  "case_load_overview": string,
  "intake_pipeline": { "intake_count": number, "active_count": number, "in_hearing_count": number, "narrative": string },
  "upcoming_hearings_7d": [{ "case_id": string, "court": string, "date": string, "status": string }],
  "top_risks": [{ "risk": string, "severity": "low"|"medium"|"high"|"critical", "owner": string }],
  "decisions_required": [{ "decision": string, "deadline": string, "options": [string], "recommendation": string }],
  "outlook": string,
  "summary": string
}`;
  const usr = `Clinic snapshot:\n${JSON.stringify(snapshot, null, 2)}`;
  const r = await callOpenRouter(sys, usr);
  return safeJsonParse(r, { summary: typeof r === 'string' ? r : 'No response' });
}

// ──────────────────────────────────────────────────────────────
// AI Feature 6: Interpreter Match
// ──────────────────────────────────────────────────────────────
async function interpreterMatch(client = {}, candidates = []) {
  const sys = `${SYSTEM_PROMPT} Match an interpreter to a client. Return strict JSON:
{
  "recommended": [{ "interpreter_id": string, "name": string, "match_score": number, "rationale": string }],
  "language_coverage_notes": string,
  "cultural_sensitivity_notes": string,
  "potential_conflicts_of_interest": [string],
  "fallback_plan": string,
  "summary": string
}`;
  const usr = `Client:\n${JSON.stringify(client, null, 2)}\nCandidates:\n${JSON.stringify(candidates, null, 2)}`;
  const r = await callOpenRouter(sys, usr);
  return safeJsonParse(r, { summary: typeof r === 'string' ? r : 'No response', recommended: [] });
}

// ──────────────────────────────────────────────────────────────
// AI Feature 7: Country Conditions Summary
// ──────────────────────────────────────────────────────────────
async function countryConditionsSummary(country, period, context = {}) {
  const sys = `${SYSTEM_PROMPT} Summarize current country conditions relevant to asylum eligibility. Return strict JSON:
{
  "country": string,
  "period": string,
  "human_rights_overview": string,
  "key_actors": [{ "actor": string, "type": "state"|"non_state"|"proxy"|"unknown", "activity_summary": string }],
  "protected_grounds_at_risk": [{ "ground": "race"|"religion"|"nationality"|"political_opinion"|"PSG", "narrative": string }],
  "internal_relocation_feasibility": "feasible"|"limited"|"unsafe",
  "key_sources": [{ "source": string, "type": string, "date": string }],
  "summary": string
}`;
  const usr = `Country: ${country}\nPeriod: ${period}\nContext: ${JSON.stringify(context)}`;
  const r = await callOpenRouter(sys, usr);
  return safeJsonParse(r, { summary: typeof r === 'string' ? r : 'No response', protected_grounds_at_risk: [] });
}

// ──────────────────────────────────────────────────────────────
// AI Feature 8: Deportation Relief Options
// ──────────────────────────────────────────────────────────────
async function deportationReliefOptions(clientFacts, current_status, context = {}) {
  const sys = `${SYSTEM_PROMPT} Lay out potentially available relief options against deportation. Return strict JSON:
{
  "relief_options": [{
    "form_of_relief": string,
    "statutory_basis": string,
    "viability": "weak"|"moderate"|"strong",
    "key_eligibility_factors": [string],
    "key_disqualifiers": [string],
    "next_steps": [string]
  }],
  "filing_deadlines": [{ "form": string, "deadline_days": number, "rationale": string }],
  "appeal_pathways": [string],
  "summary": string
}`;
  const usr = `Client facts: ${clientFacts}\nCurrent immigration status: ${current_status}\nContext: ${JSON.stringify(context)}`;
  const r = await callOpenRouter(sys, usr);
  return safeJsonParse(r, { summary: typeof r === 'string' ? r : 'No response', relief_options: [] });
}

// ──────────────────────────────────────────────────────────────
// AI Feature 9: Sponsor Petition Draft
// ──────────────────────────────────────────────────────────────
async function sponsorPetitionDraft(beneficiary, sponsor, program, context = {}) {
  const sys = `${SYSTEM_PROMPT} Draft a sponsor petition outline (I-134, Welcome Corps, etc.). Return strict JSON:
{
  "petition_outline": [{ "section": string, "draft_paragraph": string, "supporting_documents": [string] }],
  "eligibility_summary": string,
  "financial_support_narrative": string,
  "housing_plan_narrative": string,
  "missing_information": [string],
  "summary": string
}`;
  const usr = `Beneficiary: ${JSON.stringify(beneficiary)}\nSponsor: ${JSON.stringify(sponsor)}\nProgram: ${program}\nContext: ${JSON.stringify(context)}`;
  const r = await callOpenRouter(sys, usr);
  return safeJsonParse(r, { summary: typeof r === 'string' ? r : 'No response', petition_outline: [] });
}

// ──────────────────────────────────────────────────────────────
// AI Feature 10: Family Reunification Plan
// ──────────────────────────────────────────────────────────────
async function familyReunificationPlan(principal, members = [], context = {}) {
  const sys = `${SYSTEM_PROMPT} Build a family reunification action plan (I-730, P-3, parole, etc.). Return strict JSON:
{
  "principal": object,
  "eligible_members": [{ "name": string, "relationship": string, "qualifying_pathway": string, "estimated_timeline_months": number }],
  "pathways_considered": [{ "pathway": string, "fit": "good"|"partial"|"poor", "notes": string }],
  "required_documents_checklist": [string],
  "risks_and_blockers": [string],
  "recommended_next_steps": [string],
  "summary": string
}`;
  const usr = `Principal:\n${JSON.stringify(principal, null, 2)}\nMembers:\n${JSON.stringify(members, null, 2)}\nContext: ${JSON.stringify(context)}`;
  const r = await callOpenRouter(sys, usr);
  return safeJsonParse(r, { summary: typeof r === 'string' ? r : 'No response', eligible_members: [] });
}

// ──────────────────────────────────────────────────────────────
// AI Feature 11: Hardship Evidence Suggest
// ──────────────────────────────────────────────────────────────
async function hardshipEvidenceSuggest(clientFacts, relief_type, context = {}) {
  const sys = `${SYSTEM_PROMPT} Suggest hardship evidence categories for forms like I-601, cancellation of removal, etc. Return strict JSON:
{
  "relief_type": string,
  "hardship_dimensions": [{
    "dimension": string,
    "narrative_questions": [string],
    "suggested_evidence_types": [string],
    "expert_or_witness_ideas": [string]
  }],
  "cumulative_hardship_themes": [string],
  "documentation_priorities": [string],
  "summary": string
}`;
  const usr = `Client facts: ${clientFacts}\nRelief type: ${relief_type}\nContext: ${JSON.stringify(context)}`;
  const r = await callOpenRouter(sys, usr);
  return safeJsonParse(r, { summary: typeof r === 'string' ? r : 'No response', hardship_dimensions: [] });
}

// ──────────────────────────────────────────────────────────────
// AI Feature 12: Attorney Handoff Summary
// ──────────────────────────────────────────────────────────────
async function attorneyHandoffSummary(caseRecord = {}, outgoing_notes = '') {
  const sys = `${SYSTEM_PROMPT} Produce an attorney handoff packet summary. Return strict JSON:
{
  "case_snapshot": string,
  "open_action_items": [{ "item": string, "due": string, "owner": string }],
  "filings_history": [{ "form": string, "filed_at": string, "status": string }],
  "key_deadlines_next_60d": [{ "deadline": string, "what": string }],
  "client_relationship_notes": string,
  "open_questions_for_incoming_attorney": [string],
  "summary": string
}`;
  const usr = `Case:\n${JSON.stringify(caseRecord, null, 2)}\nOutgoing attorney notes: ${outgoing_notes}`;
  const r = await callOpenRouter(sys, usr);
  return safeJsonParse(r, { summary: typeof r === 'string' ? r : 'No response', open_action_items: [] });
}

// ──────────────────────────────────────────────────────────────
// AI Feature 13: Regulatory Update Brief
// ──────────────────────────────────────────────────────────────
async function regulatoryUpdateBrief(topic, jurisdiction = 'US', context = {}) {
  const sys = `${SYSTEM_PROMPT} Summarize recent regulatory / case-law updates relevant to a topic. Return strict JSON:
{
  "topic": string,
  "jurisdiction": string,
  "updates": [{ "headline": string, "type": "regulation"|"policy"|"case_law"|"executive_action", "date": string, "summary": string, "impact": "low"|"medium"|"high" }],
  "practice_pointers": [string],
  "open_questions": [string],
  "summary": string
}`;
  const usr = `Topic: ${topic}\nJurisdiction: ${jurisdiction}\nContext: ${JSON.stringify(context)}`;
  const r = await callOpenRouter(sys, usr);
  return safeJsonParse(r, { summary: typeof r === 'string' ? r : 'No response', updates: [] });
}

// ──────────────────────────────────────────────────────────────
// AI Feature 14: Partner Org Referral
// ──────────────────────────────────────────────────────────────
async function partnerOrgReferral(client = {}, need, candidates = []) {
  const sys = `${SYSTEM_PROMPT} Recommend partner orgs to refer a client to. Return strict JSON:
{
  "client_need": string,
  "recommended_orgs": [{ "org_id": string, "name": string, "fit_score": number, "rationale": string, "warm_handoff_notes": string }],
  "non_legal_needs_addressed": [string],
  "follow_up_plan": [string],
  "summary": string
}`;
  const usr = `Client:\n${JSON.stringify(client, null, 2)}\nNeed: ${need}\nCandidate orgs:\n${JSON.stringify(candidates, null, 2)}`;
  const r = await callOpenRouter(sys, usr);
  return safeJsonParse(r, { summary: typeof r === 'string' ? r : 'No response', recommended_orgs: [] });
}

// ──────────────────────────────────────────────────────────────
// AI Feature 15: Donor Impact Report
// ──────────────────────────────────────────────────────────────
async function donorImpactReport(period, metrics = {}, audience = 'major_donors') {
  const sys = `${SYSTEM_PROMPT} Draft a donor impact report (no PII; aggregates only). Return strict JSON:
{
  "period": string,
  "audience": string,
  "highlights": [string],
  "impact_metrics": [{ "metric": string, "value": string, "trend": "up"|"flat"|"down" }],
  "narrative_paragraphs": [string],
  "anonymized_story_outlines": [{ "title": string, "outline": string }],
  "calls_to_action": [string],
  "summary": string
}`;
  const usr = `Period: ${period}\nMetrics: ${JSON.stringify(metrics)}\nAudience: ${audience}`;
  const r = await callOpenRouter(sys, usr);
  return safeJsonParse(r, { summary: typeof r === 'string' ? r : 'No response', impact_metrics: [] });
}

// ──────────────────────────────────────────────────────────────
// AI Feature 16: Court Calendar Conflicts
// ──────────────────────────────────────────────────────────────
async function courtCalendarConflicts(attorneyId, calendar_window, calendar_rows = []) {
  const sys = `${SYSTEM_PROMPT} Detect calendar conflicts and travel issues across a window. Return strict JSON:
{
  "attorney_id": string,
  "window": string,
  "conflicts": [{ "type": "double_book"|"travel_infeasible"|"prep_overlap", "what": string, "when": string, "severity": "low"|"medium"|"high", "resolution_options": [string] }],
  "tight_travel_segments": [{ "from": string, "to": string, "departure": string, "arrival_needed_by": string, "feasibility": "ok"|"tight"|"infeasible" }],
  "rescheduling_recommendations": [string],
  "summary": string
}`;
  const usr = `Attorney: ${attorneyId}\nWindow: ${calendar_window}\nCalendar rows:\n${JSON.stringify(calendar_rows, null, 2)}`;
  const r = await callOpenRouter(sys, usr);
  return safeJsonParse(r, { summary: typeof r === 'string' ? r : 'No response', conflicts: [] });
}

module.exports = {
  callOpenRouter,
  safeJsonParse,
  coiCiteMemo,
  hearingPrepBrief,
  evidenceGapAnalyze,
  asylumNarrativeDraft,
  executiveBrief,
  interpreterMatch,
  countryConditionsSummary,
  deportationReliefOptions,
  sponsorPetitionDraft,
  familyReunificationPlan,
  hardshipEvidenceSuggest,
  attorneyHandoffSummary,
  regulatoryUpdateBrief,
  partnerOrgReferral,
  donorImpactReport,
  courtCalendarConflicts,
};
