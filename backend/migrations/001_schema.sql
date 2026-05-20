-- AIRefugeeAsylumCaseManager schema (core entities)

CREATE TABLE IF NOT EXISTS clients (
  id                   SERIAL PRIMARY KEY,
  client_id            VARCHAR(50) UNIQUE,
  full_name            VARCHAR(200) NOT NULL,
  country_of_origin    VARCHAR(120),
  dob                  DATE,
  intake_date          DATE,
  status               VARCHAR(30) DEFAULT 'intake',
  notes                TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cases (
  id                   SERIAL PRIMARY KEY,
  case_id              VARCHAR(50) UNIQUE,
  client_id            VARCHAR(50),
  type                 VARCHAR(60),
  lead_attorney        VARCHAR(150),
  opened_at            DATE,
  status               VARCHAR(30) DEFAULT 'open',
  notes                TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hearings (
  id                   SERIAL PRIMARY KEY,
  hearing_id           VARCHAR(50) UNIQUE,
  case_id              VARCHAR(50),
  court                VARCHAR(150),
  date                 TIMESTAMPTZ,
  judge                VARCHAR(150),
  status               VARCHAR(30) DEFAULT 'scheduled',
  notes                TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dossiers (
  id                   SERIAL PRIMARY KEY,
  dossier_id           VARCHAR(50) UNIQUE,
  case_id              VARCHAR(50),
  version              VARCHAR(20),
  doc_count            INTEGER DEFAULT 0,
  last_updated         DATE,
  status               VARCHAR(30) DEFAULT 'draft',
  notes                TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS country_of_origin_info (
  id                   SERIAL PRIMARY KEY,
  coi_id               VARCHAR(50) UNIQUE,
  country              VARCHAR(120),
  period               VARCHAR(80),
  source               VARCHAR(200),
  retrieved_at         DATE,
  citation_count       INTEGER DEFAULT 0,
  notes                TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS immigration_forms (
  id                   SERIAL PRIMARY KEY,
  form_id              VARCHAR(50) UNIQUE,
  case_id              VARCHAR(50),
  form_type            VARCHAR(50),
  version              VARCHAR(20),
  filed_at             DATE,
  status               VARCHAR(30) DEFAULT 'draft',
  notes                TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS evidence_docs (
  id                   SERIAL PRIMARY KEY,
  doc_id               VARCHAR(50) UNIQUE,
  case_id              VARCHAR(50),
  type                 VARCHAR(60),
  source               VARCHAR(200),
  uploaded_at          DATE,
  status               VARCHAR(30) DEFAULT 'pending_review',
  notes                TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expert_witnesses (
  id                   SERIAL PRIMARY KEY,
  witness_id           VARCHAR(50) UNIQUE,
  name                 VARCHAR(150),
  expertise            VARCHAR(200),
  case_id              VARCHAR(50),
  fee_usd              INTEGER DEFAULT 0,
  status               VARCHAR(30) DEFAULT 'engaged',
  notes                TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_results (
  id              SERIAL PRIMARY KEY,
  feature         VARCHAR(80) NOT NULL,
  input           JSONB,
  output          JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_results_feature_created
  ON ai_results (feature, created_at DESC);
