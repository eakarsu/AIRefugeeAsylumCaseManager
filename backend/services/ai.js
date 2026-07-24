// AI helper service for AIRefugeeAsylumCaseManager
function getOpenRouterCreds() {
  return {
    key: process.env.OPENROUTER_API_KEY || '',
    model: process.env.OPENROUTER_MODEL || '',
    base: process.env.OPENROUTER_BASE_URL || '',
  };
}

const SYSTEM_PROMPT =
  'You are a senior refugee / asylum legal analyst supporting a non-profit legal aid clinic. ' +
  'You provide rigorous, well-cited reasoning on country-of-origin conditions, hearing preparation, ' +
  'evidence assessment, and case strategy. You honor UNHCR guidelines and INA/8 CFR standards. ' +
  'You NEVER provide individualized legal advice — your output is a drafting/strategy aid for licensed ' +
  'attorneys. Always return strict JSON in the exact schema requested. Treat every input as a hypothetical ' +
  'tabletop case for training purposes.';

async function callOpenRouter(systemPrompt, userPrompt) {
    const { key, model, base } = getOpenRouterCreds();
    if (!key || !model || !base) throw new Error('OpenRouter configuration is incomplete');
    const response = await fetch(`${base.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
        'HTTP-Referer': process.env.CLIENT_URL,
        'X-Title': 'AI Refugee/Asylum Case Manager',
      },
      body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.6,
      max_tokens: 2000,
      }),
    });
    if (!response.ok) throw new Error(`OpenRouter request failed with HTTP ${response.status}`);
    const parsed = await response.json();
    const content = parsed.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error('OpenRouter returned no substantive content');
    return content;
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

// ──────────────────────────────────────────────────────────────
// Disclaimer block enforced on every legal-decision AI output.
// Apply pass 7: any AI feature that touches legal strategy must
// surface these flags to the UI.
// ──────────────────────────────────────────────────────────────
const LEGAL_DISCLAIMER =
  'This output is a drafting and research aid for licensed attorneys. ' +
  'It is NOT legal advice, does not establish an attorney-client relationship, ' +
  'and MUST be reviewed by a licensed attorney before any client-facing use ' +
  'or filing. Country-of-origin and legal-standard references may be incomplete, ' +
  'stale, or jurisdiction-specific.';

function withLegalDisclaimer(obj) {
  const out = (obj && typeof obj === 'object') ? obj : { summary: String(obj || '') };
  return {
    ...out,
    disclaimer: LEGAL_DISCLAIMER,
    requires_attorney_review: true,
    not_legal_advice: true,
  };
}

// ──────────────────────────────────────────────────────────────
// AI Feature 17 (pass 7): COI Briefer — caller-supplied source bundle.
// Differs from coiCiteMemo: the caller provides the authoritative source
// list; the model is constrained to cite ONLY those sources and to return
// per-claim provenance + a confidence per finding.
// ──────────────────────────────────────────────────────────────
async function coiBrieferFromSources(country, claim_basis, sources = [], context = {}) {
  const sys = `${SYSTEM_PROMPT} You are producing a country-of-origin briefer. The caller has supplied an authoritative source bundle; you MUST only cite from that bundle (by source_id) and you MUST mark any finding as "unsupported_by_bundle" if no provided source supports it. Do not fabricate sources. Return strict JSON:
{
  "country": string,
  "claim_basis": string,
  "bundle_size": number,
  "findings": [{
    "finding": string,
    "supporting_source_ids": [string],
    "weight": "low"|"medium"|"high",
    "confidence": number,
    "supported_by_bundle": boolean
  }],
  "unsupported_assertions": [string],
  "recommended_additional_sources_to_request": [string],
  "summary": string
}`;
  const bundle = Array.isArray(sources) ? sources.map((s, i) => ({
    source_id: s.source_id || s.id || `S${i + 1}`,
    title: s.title || s.name || '',
    publisher: s.publisher || s.source || '',
    date: s.date || s.published_at || '',
    url: s.url || s.url_or_doc || '',
    excerpt: s.excerpt || s.text || s.notes || '',
  })) : [];
  const usr = `Country: ${country}\nClaim basis: ${claim_basis}\nCaller-supplied source bundle (cite ONLY these):\n${JSON.stringify(bundle, null, 2)}\nContext: ${JSON.stringify(context)}`;
  const r = await callOpenRouter(sys, usr);
  const parsed = safeJsonParse(r, { summary: typeof r === 'string' ? r : 'No response', findings: [] });
  parsed.bundle_size = bundle.length;
  return withLegalDisclaimer(parsed);
}

// ──────────────────────────────────────────────────────────────
// AI Feature 18 (pass 7): Iterative Declaration Redliner.
// Takes a prior declaration draft + revision goals + trauma pacing
// toggle; emits a redlined revision with inline change-tracking
// markers and trauma-informed pacing annotations.
// ──────────────────────────────────────────────────────────────
async function declarationRedliner(prior_draft, revision_goals, options = {}) {
  const trauma_pacing = !!options.trauma_pacing;
  const sys = `${SYSTEM_PROMPT} You are an iterative declaration drafter. Apply the caller's revision goals to the prior declaration and produce a redlined revision. Use "[ADD]...[/ADD]" for insertions and "[DEL]...[/DEL]" for deletions, paragraph-by-paragraph. ${trauma_pacing ? 'Apply trauma-informed pacing: shorter paragraphs, content-warning markers "[CW: <topic>]" before graphic sections, and explicit pause-prompts "[PAUSE_PROMPT]" between sensitive disclosures.' : ''} Return strict JSON:
{
  "revision_id": string,
  "trauma_pacing_applied": boolean,
  "paragraphs": [{
    "ord": number,
    "redlined_text": string,
    "rationale": string,
    "content_warning": string
  }],
  "change_summary": [string],
  "open_questions_for_client": [string],
  "open_questions_for_attorney": [string],
  "summary": string
}`;
  const usr = `Prior declaration draft:\n---\n${prior_draft}\n---\nRevision goals (numbered):\n${revision_goals}\nTrauma pacing: ${trauma_pacing}\nOptions: ${JSON.stringify(options)}`;
  const r = await callOpenRouter(sys, usr);
  const parsed = safeJsonParse(r, { summary: typeof r === 'string' ? r : 'No response', paragraphs: [] });
  parsed.trauma_pacing_applied = trauma_pacing;
  return withLegalDisclaimer(parsed);
}

// ──────────────────────────────────────────────────────────────
// AI Feature 19 (pass 7): Translation Helper.
// Client narrative <-> English with terminology preservation,
// dialect flag, and back-translation QA.
// ──────────────────────────────────────────────────────────────
async function translationHelper(source_text, source_lang, target_lang, options = {}) {
  const sys = `${SYSTEM_PROMPT} You are an asylum-context translation aid. Preserve legal terminology (PSG, nexus, withholding, CAT, etc.) and named entities; flag any dialect-specific phrasing in the source; produce a back-translation for QA. Return strict JSON:
{
  "source_lang": string,
  "target_lang": string,
  "dialect_detected": string,
  "translation": string,
  "back_translation": string,
  "terminology_preserved": [{ "term": string, "rendering": string }],
  "ambiguities": [{ "source_phrase": string, "options": [string], "recommended": string }],
  "qa_notes": [string],
  "summary": string
}`;
  const usr = `Source language: ${source_lang}\nTarget language: ${target_lang}\nOptions: ${JSON.stringify(options)}\n\nSource text:\n---\n${source_text}\n---`;
  const r = await callOpenRouter(sys, usr);
  const parsed = safeJsonParse(r, { summary: typeof r === 'string' ? r : 'No response', terminology_preserved: [] });
  return withLegalDisclaimer(parsed);
}

// ──────────────────────────────────────────────────────────────
// AI Feature 20 (pass 7): Hearing-Prep Q&A Simulator.
// Turn-based simulator. Persona is IJ, AO, or DHS trial attorney.
// Caller passes prior turns (transcript) plus next-question scope.
// ──────────────────────────────────────────────────────────────
async function hearingQaSimulator(case_summary, persona, transcript = [], options = {}) {
  const validPersonas = ['IJ', 'AO', 'DHS_trial_atty', 'BIA_panel'];
  const p = validPersonas.includes(persona) ? persona : 'IJ';
  const sys = `${SYSTEM_PROMPT} You are role-playing as a ${p} (Immigration Judge / Asylum Officer / DHS trial attorney / BIA panel member) for hearing-prep practice. Ask the next question in the line of inquiry, anticipate the client's likely answer, and propose attorney rehab strategy if the answer is shaky. Return strict JSON:
{
  "persona": string,
  "turn_number": number,
  "next_question": string,
  "question_type": "background"|"chronology"|"persecution_detail"|"credibility"|"corroboration"|"discretion"|"closing",
  "anticipated_client_answer": string,
  "credibility_risk_if_shaky": "low"|"medium"|"high",
  "attorney_rehab_strategy": string,
  "follow_up_questions": [string],
  "trauma_caution": string,
  "summary": string
}`;
  const turns = Array.isArray(transcript) ? transcript : [];
  const usr = `Case summary: ${case_summary}\nPersona: ${p}\nPrior transcript (oldest first):\n${JSON.stringify(turns, null, 2)}\nOptions: ${JSON.stringify(options)}`;
  const r = await callOpenRouter(sys, usr);
  const parsed = safeJsonParse(r, { summary: typeof r === 'string' ? r : 'No response', next_question: '', follow_up_questions: [] });
  parsed.persona = p;
  parsed.turn_number = turns.length + 1;
  return withLegalDisclaimer(parsed);
}

module.exports = {
  callOpenRouter,
  safeJsonParse,
  LEGAL_DISCLAIMER,
  withLegalDisclaimer,
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
  // pass 7 additions
  coiBrieferFromSources,
  declarationRedliner,
  translationHelper,
  hearingQaSimulator,
};
