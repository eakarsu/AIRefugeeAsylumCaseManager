-- AIRefugeeAsylumCaseManager — Apply pass 7 (full backlog implementation)
-- Adds: PII encryption-at-rest (clients/cases), trauma-informed UX flags,
-- deterministic court-dates + ICS export support, i18n string table,
-- document redaction pipeline.

-- ─────────────────────────────────────────────
-- PII encryption-at-rest columns
-- (ciphertext is base64 of crypto.aes-256-gcm output; iv + tag prefixed)
-- ─────────────────────────────────────────────
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS pii_encrypted   TEXT,
  ADD COLUMN IF NOT EXISTS pii_kid         VARCHAR(40),
  ADD COLUMN IF NOT EXISTS trauma_sensitive BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS trauma_flags    TEXT;

ALTER TABLE cases
  ADD COLUMN IF NOT EXISTS pii_encrypted   TEXT,
  ADD COLUMN IF NOT EXISTS pii_kid         VARCHAR(40),
  ADD COLUMN IF NOT EXISTS trauma_sensitive BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS trauma_flags    TEXT;

-- ─────────────────────────────────────────────
-- Deterministic court-date scheduling + ICS export
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS court_dates (
  id              SERIAL PRIMARY KEY,
  court_date_id   VARCHAR(50) UNIQUE,
  case_id         VARCHAR(50),
  attorney_id     VARCHAR(50),
  court           VARCHAR(150),
  starts_at       TIMESTAMPTZ,
  ends_at         TIMESTAMPTZ,
  kind            VARCHAR(40),     -- master_calendar | merits | bia_oral | filing | prep
  location        VARCHAR(200),
  status          VARCHAR(30) DEFAULT 'scheduled',
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_court_dates_attorney_starts
  ON court_dates (attorney_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_court_dates_case_starts
  ON court_dates (case_id, starts_at);

-- ─────────────────────────────────────────────
-- i18n: string bundles by locale
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS i18n_strings (
  id              SERIAL PRIMARY KEY,
  locale          VARCHAR(10) NOT NULL,
  namespace       VARCHAR(60) DEFAULT 'common',
  string_key      VARCHAR(200) NOT NULL,
  value           TEXT,
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (locale, namespace, string_key)
);
CREATE INDEX IF NOT EXISTS idx_i18n_locale_ns
  ON i18n_strings (locale, namespace);

-- Seed minimal English bundle so the UI has something to fall back on.
INSERT INTO i18n_strings (locale, namespace, string_key, value) VALUES
  ('en','common','app.name','Asylum Case Manager'),
  ('en','common','nav.overview','Overview'),
  ('en','common','nav.clients','Clients'),
  ('en','common','nav.cases','Cases'),
  ('en','common','nav.hearings','Hearings'),
  ('en','common','disclaimer.not_legal_advice','Not legal advice. Requires licensed-attorney review.'),
  ('es','common','app.name','Gestor de Casos de Asilo'),
  ('es','common','nav.overview','Resumen'),
  ('es','common','nav.clients','Clientes'),
  ('es','common','nav.cases','Casos'),
  ('es','common','nav.hearings','Audiencias'),
  ('es','common','disclaimer.not_legal_advice','No es asesoramiento legal. Requiere revisión por un abogado autorizado.'),
  ('ar','common','app.name','مدير قضايا اللجوء'),
  ('ar','common','nav.overview','نظرة عامة'),
  ('ar','common','nav.clients','العملاء'),
  ('ar','common','nav.cases','القضايا'),
  ('ar','common','nav.hearings','الجلسات'),
  ('ar','common','disclaimer.not_legal_advice','ليست استشارة قانونية. تتطلب مراجعة محامٍ مرخص.'),
  ('fr','common','app.name','Gestionnaire de Cas d''Asile'),
  ('fr','common','nav.overview','Aperçu'),
  ('fr','common','nav.clients','Clients'),
  ('fr','common','nav.cases','Affaires'),
  ('fr','common','nav.hearings','Audiences'),
  ('fr','common','disclaimer.not_legal_advice','Pas un conseil juridique. Nécessite l''examen d''un avocat agréé.'),
  ('uk','common','app.name','Менеджер справ про притулок'),
  ('uk','common','nav.overview','Огляд'),
  ('uk','common','nav.clients','Клієнти'),
  ('uk','common','nav.cases','Справи'),
  ('uk','common','nav.hearings','Слухання'),
  ('uk','common','disclaimer.not_legal_advice','Не є юридичною консультацією. Потрібна перевірка ліцензованим адвокатом.')
ON CONFLICT (locale, namespace, string_key) DO NOTHING;

-- ─────────────────────────────────────────────
-- Document redaction pipeline
-- (link is to original attachment; stores masks + redacted derivative path)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS document_redactions (
  id              SERIAL PRIMARY KEY,
  redaction_id    VARCHAR(50) UNIQUE,
  attachment_id   INTEGER,
  evidence_doc_id VARCHAR(50),
  redacted_path   VARCHAR(500),
  masks           JSONB,            -- [{page, x, y, w, h, label}]
  reason          VARCHAR(120),
  applied_by      VARCHAR(150),
  status          VARCHAR(30) DEFAULT 'draft', -- draft | applied | reverted
  watermark       VARCHAR(120),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_redactions_attachment
  ON document_redactions (attachment_id);
