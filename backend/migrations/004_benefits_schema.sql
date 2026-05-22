-- AIRefugeeAsylumCaseManager — Government Benefits Eligibility Engine
-- Migration 004: creates 9 benefit_* tables (idempotent via IF NOT EXISTS)

-- ─────────────────────────────────────────────
-- 1. benefit_medicaid_eligibility
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS benefit_medicaid_eligibility (
  id                    SERIAL PRIMARY KEY,
  case_id               INTEGER,
  applicant_id          INTEGER,
  eligibility_pathway   TEXT,
  magi_income           NUMERIC,
  fpl_percentage        NUMERIC,
  household_size        INTEGER,
  citizenship_status    TEXT,
  immigration_status    TEXT,
  five_year_bar_applies BOOLEAN,
  state                 TEXT,
  program_type          TEXT,
  determination_date    DATE,
  renewal_date          DATE,
  status                TEXT,
  notes                 TEXT,
  ai_summary            TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  archived_at           TIMESTAMPTZ,
  ai_result             JSONB
);

-- ─────────────────────────────────────────────
-- 2. benefit_snap_eligibility
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS benefit_snap_eligibility (
  id                         SERIAL PRIMARY KEY,
  case_id                    INTEGER,
  applicant_id               INTEGER,
  household_size             INTEGER,
  gross_monthly_income       NUMERIC,
  net_monthly_income         NUMERIC,
  gross_income_limit         NUMERIC,
  net_income_limit           NUMERIC,
  standard_deduction         NUMERIC,
  earned_income_deduction    NUMERIC,
  dependent_care_deduction   NUMERIC,
  shelter_deduction          NUMERIC,
  medical_deduction          NUMERIC,
  abawd_status               TEXT,
  categorical_eligibility    TEXT,
  immigration_status         TEXT,
  state                      TEXT,
  benefit_amount             NUMERIC,
  certification_period_end   DATE,
  status                     TEXT,
  notes                      TEXT,
  ai_summary                 TEXT,
  created_at                 TIMESTAMPTZ DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ DEFAULT NOW(),
  archived_at                TIMESTAMPTZ,
  ai_result                  JSONB
);

-- ─────────────────────────────────────────────
-- 3. benefit_ssi_ssdi_eligibility
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS benefit_ssi_ssdi_eligibility (
  id                    SERIAL PRIMARY KEY,
  case_id               INTEGER,
  applicant_id          INTEGER,
  program_type          TEXT,
  disability_onset_date DATE,
  medical_conditions    TEXT,
  listings_considered   TEXT,
  sga_monthly_amount    NUMERIC,
  countable_income      NUMERIC,
  countable_resources   NUMERIC,
  citizenship_status    TEXT,
  work_credits          NUMERIC,
  application_date      DATE,
  determination_date    DATE,
  decision              TEXT,
  rfc_assessment        TEXT,
  status                TEXT,
  notes                 TEXT,
  ai_summary            TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  archived_at           TIMESTAMPTZ,
  ai_result             JSONB
);

-- ─────────────────────────────────────────────
-- 4. benefit_tanf_calc
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS benefit_tanf_calc (
  id                         SERIAL PRIMARY KEY,
  case_id                    INTEGER,
  applicant_id               INTEGER,
  household_size             INTEGER,
  number_of_children         INTEGER,
  benefit_amount             NUMERIC,
  maximum_benefit            NUMERIC,
  income_deduction           NUMERIC,
  work_participation_status  TEXT,
  months_on_tanf_federal     INTEGER,
  months_on_tanf_state       INTEGER,
  time_limit_federal_exhausted BOOLEAN,
  time_limit_state_exhausted BOOLEAN,
  sanction_level             TEXT,
  sanction_reason            TEXT,
  irp_status                 TEXT,
  domestic_violence_flag     BOOLEAN,
  immigration_status         TEXT,
  state                      TEXT,
  status                     TEXT,
  notes                      TEXT,
  ai_summary                 TEXT,
  created_at                 TIMESTAMPTZ DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ DEFAULT NOW(),
  archived_at                TIMESTAMPTZ,
  ai_result                  JSONB
);

-- ─────────────────────────────────────────────
-- 5. benefit_income_verification
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS benefit_income_verification (
  id                       SERIAL PRIMARY KEY,
  case_id                  INTEGER,
  applicant_id             INTEGER,
  verification_type        TEXT,
  income_type              TEXT,
  gross_monthly_income     NUMERIC,
  net_monthly_income       NUMERIC,
  employer_name            TEXT,
  pay_frequency            TEXT,
  verification_document    TEXT,
  verification_date        DATE,
  discrepancy_flag         BOOLEAN,
  discrepancy_description  TEXT,
  program_context          TEXT,
  status                   TEXT,
  notes                    TEXT,
  ai_summary               TEXT,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW(),
  archived_at              TIMESTAMPTZ,
  ai_result                JSONB
);

-- ─────────────────────────────────────────────
-- 6. benefit_asset_tests
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS benefit_asset_tests (
  id                              SERIAL PRIMARY KEY,
  case_id                         INTEGER,
  applicant_id                    INTEGER,
  program                         TEXT,
  total_countable_assets          NUMERIC,
  asset_limit                     NUMERIC,
  vehicle_equity                  NUMERIC,
  home_equity                     NUMERIC,
  bank_accounts                   NUMERIC,
  life_insurance_csv              NUMERIC,
  burial_fund                     NUMERIC,
  retirement_accounts             NUMERIC,
  trust_assets                    NUMERIC,
  business_property               NUMERIC,
  transferred_assets_last_60_months NUMERIC,
  look_back_penalty_months        INTEGER,
  able_account_balance            NUMERIC,
  passes_asset_test               BOOLEAN,
  status                          TEXT,
  notes                           TEXT,
  ai_summary                      TEXT,
  created_at                      TIMESTAMPTZ DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ DEFAULT NOW(),
  archived_at                     TIMESTAMPTZ,
  ai_result                       JSONB
);

-- ─────────────────────────────────────────────
-- 7. benefit_household_composition
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS benefit_household_composition (
  id                       SERIAL PRIMARY KEY,
  case_id                  INTEGER,
  applicant_id             INTEGER,
  primary_applicant_id     INTEGER,
  household_members        JSONB,
  household_size           INTEGER,
  snap_unit_size           INTEGER,
  medicaid_unit_size       INTEGER,
  tanf_unit_size           INTEGER,
  shared_living_arrangement TEXT,
  tax_filer_status         TEXT,
  pregnancy_status         TEXT,
  non_citizen_members      JSONB,
  composition_dispute      BOOLEAN,
  state                    TEXT,
  status                   TEXT,
  notes                    TEXT,
  ai_summary               TEXT,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW(),
  archived_at              TIMESTAMPTZ,
  ai_result                JSONB
);

-- ─────────────────────────────────────────────
-- 8. benefit_notice_generation
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS benefit_notice_generation (
  id                    SERIAL PRIMARY KEY,
  case_id               INTEGER,
  applicant_id          INTEGER,
  notice_type           TEXT,
  program               TEXT,
  determination         TEXT,
  effective_date        DATE,
  denial_reasons        TEXT,
  appeal_deadline       INTEGER,
  appeal_deadline_date  DATE,
  hearing_rights        TEXT,
  notice_text           TEXT,
  language              TEXT,
  translation_required  BOOLEAN,
  sent_date             DATE,
  delivery_method       TEXT,
  procedural_defects    JSONB,
  status                TEXT,
  notes                 TEXT,
  ai_summary            TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  archived_at           TIMESTAMPTZ,
  ai_result             JSONB
);

-- ─────────────────────────────────────────────
-- 9. benefit_appeals_workflow
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS benefit_appeals_workflow (
  id                        SERIAL PRIMARY KEY,
  case_id                   INTEGER,
  applicant_id              INTEGER,
  appeal_type               TEXT,
  program                   TEXT,
  appeal_issue              TEXT,
  original_action           TEXT,
  appeal_filed_date         DATE,
  hearing_date              DATE,
  hearing_scheduled_date    DATE,
  hearing_location          TEXT,
  alj_name                  TEXT,
  appellant_representative  TEXT,
  aid_pending_requested     BOOLEAN,
  aid_pending_granted       BOOLEAN,
  mediation_offered         BOOLEAN,
  mediation_accepted        BOOLEAN,
  evidence_submitted        JSONB,
  decision                  TEXT,
  decision_date             DATE,
  decision_summary          TEXT,
  post_hearing_action       TEXT,
  status                    TEXT,
  notes                     TEXT,
  ai_summary                TEXT,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW(),
  archived_at               TIMESTAMPTZ,
  ai_result                 JSONB
);
