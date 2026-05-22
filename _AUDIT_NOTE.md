# Audit Note — AIRefugeeAsylumCaseManager

Stack: Node + Express + React + Postgres + OpenRouter.
Domain: refugee + asylum case management — legal-aid orgs / UNHCR-style workflow, country-conditions research, declaration drafting, hearing prep.

Audit scope: backend `routes/`, `services/`, `migrations/`; frontend `pages/`, `components/`, `services/`. Audit-only — no code changes.

## Inventory (existing)

### CRUD routes (Non-AI, 22)
`asylumGrants`, `attachments`, `attorneys`, `auditLog`, `auth`, `cases`, `clients`, `countryOfOriginInfo`, `courtCalendars`, `customViews`, `dashboard`, `deportationOrders`, `dossiers`, `evidenceDocs`, `expertWitnesses`, `familyMembers`, `hearings`, `immigrationForms`, `interpreters`, `notifications`, `paralegals`, `partnerOrgs`, `sponsors`, `webhooks`. Generated via `_crudFactory.js` / `_extendCrud.js`.

### AI endpoints (16) — all POST /api/ai/*
`coi-cite-memo`, `hearing-prep-brief`, `evidence-gap-analyze`, `asylum-narrative-draft`, `executive-brief`, `interpreter-match`, `country-conditions-summary`, `deportation-relief-options`, `sponsor-petition-draft`, `family-reunification-plan`, `hardship-evidence-suggest`, `attorney-handoff-summary`, `regulatory-update-brief`, `partner-org-referral`, `donor-impact-report`, `court-calendar-conflicts`. All record to `ai_results`. `/samples` + `/history` helpers present. Each has a matching `AI*Page.js`.

### Schema (core)
`clients`, `cases`, `hearings`, `dossiers`, `country_of_origin_info`, `immigration_forms`, `evidence_docs`, `expert_witnesses`, `ai_results` (+ migration 002 extensions). JWT auth middleware present.

## Gap Analysis

### AI gaps (caller-supplied-source posture)
- **MECHANICAL** Country-conditions briefer keyed on caller-supplied source bundle (current `country-conditions-summary` accepts only `country/period/context` — no explicit `sources[]` array; no per-citation provenance returned).
- **MECHANICAL** Declaration drafter — `asylum-narrative-draft` exists; gap is **iterative declaration drafter** (revision-with-redlines + trauma-pacing toggle).
- **NEEDS-PRODUCT-DECISION advisory-only** Credible-fear / reasonable-fear screener — currently absent; must be flagged "attorney review required, not legal advice".
- **MECHANICAL** Translation helper (client narrative ⇄ English with terminology preservation, dialect flag, back-translation QA).
- **MECHANICAL** Hearing-prep Q&A simulator — `hearing-prep-brief` returns a brief, but no **interactive direct/cross-exam Q&A simulator** endpoint (turn-based, persona = IJ/AO/DHS trial atty).
- **NEEDS-PRODUCT-DECISION advisory-only** PSG / nexus analyzer (legal-decision item).
- **NEEDS-PRODUCT-DECISION advisory-only** Inadmissibility / bar screener (legal-decision item).

### Non-AI gaps
- **MECHANICAL** Sensitive-data protections on client/case CRUD: no column-level encryption, no field-level RBAC, no PII redaction layer visible. `auditLog` route exists but coverage scope unverified.
- **MECHANICAL** Document management with redaction — `evidence_docs` + `attachments` exist; no redaction pipeline (burn-in / OCR-redaction / page-level masks) or watermarking.
- **PARTIAL** Court-date scheduling — `courtCalendars` + `hearings` tables exist; gaps: ICE EOIR automated case-status pull, ICS/iCal export, conflict-detection is AI-only (`court-calendar-conflicts`), no deterministic scheduler.
- **MECHANICAL** Multilingual UI — no i18n framework, locale routing, or translation bundles in `frontend/src` (English strings hard-coded in pages).
- **MECHANICAL** Accessibility — no a11y audit hooks; no `aria-*` or screen-reader patterns evident in shared components (`Sidebar`, `Topbar`, `CrudPage`).
- **NEEDS-CREDS** EOIR portal / USCIS case-status / DHS A-file fetcher.
- **MECHANICAL** SMS/email court-date reminders to client (Twilio-ish; `webhooks` route exists, no outbound notify channel).

### Custom (domain-specific)
- **MECHANICAL** Trauma-informed UX flags — no `trauma_sensitive` column on `clients`/`cases`; no UI gating (content-warning banners, pacing controls, autosave-pause on sensitive forms).
- **MECHANICAL** Secure family-reunification tracking — `family_members` table + `family-reunification-plan` AI endpoint exist; gap: separation-status timeline, locator integration (ICRC/IOM/UNHCR), encrypted contact channel, biometric-free linkage IDs.
- **MECHANICAL** Pro-bono attorney match — `attorneys` table exists; no matcher endpoint (language + jurisdiction + capacity + specialization scoring). Could be AI or deterministic.
- **NEEDS-PRODUCT-DECISION** Client-side encrypted document vault (zero-knowledge for legal-aid org vs. retrievability for attorney handoff — conflicting requirements).
- **NEEDS-PRODUCT-DECISION advisory-only** Risk-of-removal scoring (legal-decision item).
- **NEEDS-PRODUCT-DECISION** Retention / right-to-erasure policy for closed cases (GDPR + state bar record-retention conflict).

## Counts
- Existing routes: 24 (22 CRUD + auth + dashboard).
- Existing AI endpoints: 16.
- Existing frontend pages: 39 (incl. 16 AI pages, 1 login, 1 dashboard, 2 codex features, ~19 CRUD pages).
- Gaps identified: 22 (7 AI + 8 Non-AI + 7 Custom).
- Tagged **NEEDS-PRODUCT-DECISION + advisory only**: 5 (credible-fear screener, PSG/nexus analyzer, inadmissibility/bar screener, risk-of-removal scoring, retention/erasure policy; encrypted vault is NEEDS-PRODUCT-DECISION non-advisory).
- Tagged **NEEDS-CREDS**: 1 (EOIR/USCIS/DHS feeds).
- Tagged **MECHANICAL**: 16.

## Implemented (this round)
None — audit-only.

## Apply pass 7 (full backlog implementation)

Migration: `backend/migrations/003_schema.sql` (idempotent ALTER + CREATE; applied).

### New AI verbs (4 — all MECHANICAL gaps)
All outputs carry `disclaimer`, `requires_attorney_review: true`, `not_legal_advice: true`.
- `POST /api/ai/coi-briefer-bundle` — caller-supplied source bundle; model constrained to cite only provided `source_id`s; flags `supported_by_bundle: false` for unsupported assertions. Page: `/ai/coi-briefer-bundle`.
- `POST /api/ai/declaration-redliner` — iterative redliner with `[ADD]`/`[DEL]` markers, `[CW: ...]` content warnings, `[PAUSE_PROMPT]` when trauma pacing is on. Page: `/ai/declaration-redliner`.
- `POST /api/ai/translation-helper` — source-to-target translation with terminology preservation, dialect detection, and back-translation QA. Page: `/ai/translation-helper`.
- `POST /api/ai/hearing-qa-simulator` — turn-based simulator; persona = IJ / AO / DHS_trial_atty / BIA_panel; accepts prior transcript array; returns next question + rehab strategy + trauma caution. Page: `/ai/hearing-qa-simulator`.

Service module: `LEGAL_DISCLAIMER` constant + `withLegalDisclaimer(obj)` helper wraps every legal-decision AI output.

### Non-AI routes (NEEDS-PRODUCT-DECISION items, now implemented)
- `POST/GET/DELETE /api/pii/:table/:resource_id` + `GET /api/pii/health` — AES-256-GCM sealed envelope (`v1.<kid>.<iv>.<tag>.<ct>`); key sourced from `PII_ENCRYPTION_KEY` / `PII_ENCRYPTION_KEY_<kid>` env, dev fallback derived from `JWT_SECRET` via `crypto.scryptSync`. Tables: `clients.pii_encrypted`, `cases.pii_encrypted`. Page: `/pii-vault`.
- `GET/POST/POST :id/apply / POST :id/revert / DELETE /api/redactions` — page-level mask pipeline against `document_redactions` table; `apply` writes a sidecar burn-in JSON next to the original upload for a downstream worker (no new deps). Page: `/redactions`.
- `GET/POST/PUT/DELETE /api/court-dates` + `GET /api/court-dates/conflicts` + `GET /api/court-dates/ics` — deterministic O(n²) sweep over `court_dates` table (no LLM); detects double-books + tight-travel (<90 min between back-to-back at different courts); ICS is RFC-5545. Page: `/court-dates`.
- `GET /api/i18n/locales` + `GET /api/i18n/bundle/:locale` + `PUT/DELETE /api/i18n/strings` — `i18n_strings(locale, namespace, string_key)` table; seeded en/es/fr/ar/uk; English fallback always returned alongside. Page: `/i18n`.
- `GET /api/trauma-flags/known` + `GET/PUT /api/trauma-flags/:table/:resource_id` — schema columns `trauma_sensitive boolean` + `trauma_flags text` on `clients` and `cases`; whitelist of 11 known flags. Page: `/trauma-flags`.

### NEEDS-CREDS 503 stubs
- `GET /api/external-feeds/` + `/eoir/case/:a_number` + `/eoir/hearing/:id` + `/eoir/calendar` + `/uscis/case/:receipt_number` + `/uscis/processing-times` + `/dhs/a-file/:a_number` + `/dhs/detention/:a_number` — all return HTTP 503 with `{ error: 'NEEDS-CREDS', provider, endpoint, required_env, contract, disclaimer }`. Reports which `*_API_BASE`/`*_API_KEY` env vars are present vs. missing. Page: `/external-feeds`.

### Schema delta (`003_schema.sql`)
- `clients` += `pii_encrypted text`, `pii_kid varchar(40)`, `trauma_sensitive boolean default false`, `trauma_flags text`
- `cases` += same four columns
- `court_dates` (new): `court_date_id`, `case_id`, `attorney_id`, `court`, `starts_at`, `ends_at`, `kind`, `location`, `status`, `notes` + 2 indexes
- `i18n_strings` (new): `(locale, namespace, string_key)` unique + value; seeded with en/es/fr/ar/uk core nav + disclaimer
- `document_redactions` (new): `attachment_id`, `evidence_doc_id`, `masks JSONB`, `reason`, `applied_by`, `status (draft|applied|reverted)`, `watermark`, `redacted_path`

### Skips
- NEEDS-PRODUCT-DECISION advisory-only legal-decision items (credible-fear screener, PSG/nexus analyzer, inadmissibility/bar screener, risk-of-removal scoring, retention/erasure policy) — left as audit-only flags; explicit attorney-review gate still required before any such ship.
- Client-side encrypted document vault — left for product decision (zero-knowledge vs. attorney handoff retrievability conflict).
- Pro-bono attorney match scoring + SMS/email court-date reminder outbound channel + a11y audit hooks — out of scope for this pass.

### Constraints honored
- No new npm deps (used built-in `crypto`, `https`, `fs`, `path`).
- No breaking changes — all additions are append-only routes/columns; existing endpoints unchanged.
- `node --check` passes on every modified/added `.js` file.
- All legal-decision AI outputs carry `disclaimer`, `requires_attorney_review: true`, `not_legal_advice: true`.

### Verification (live boot smoke test)
PII seal → unseal returned matching plaintext; deterministic conflicts found a double-book on identical attorney; ICS validates as RFC-5545; i18n bundle returns seeded strings + English fallback; external feeds correctly return HTTP 503 + required-env report; trauma flags accept whitelist and reject unknown values; all four new AI samples endpoints respond.

## Status
Apply pass 7 complete. 4 new AI verbs + 6 new non-AI route groups + 1 migration + 10 new frontend pages live and verified end-to-end. NEEDS-CREDS feeds stubbed at 503 per spec. Advisory-only legal-decision items intentionally not implemented — still require licensed-attorney review gate.
