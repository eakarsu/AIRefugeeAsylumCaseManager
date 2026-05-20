-- AIRefugeeAsylumCaseManager v2 schema additions
-- Adds 10 more CRUD entities + RBAC users + notifications + attachments + webhooks + webhook_deliveries

-- ─────────────────────────────────────────────
-- RBAC
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              SERIAL PRIMARY KEY,
  email           VARCHAR(150) UNIQUE NOT NULL,
  password        VARCHAR(120) NOT NULL,
  name            VARCHAR(120),
  role            VARCHAR(20) DEFAULT 'viewer',  -- admin|attorney|viewer
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- Notifications
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER,
  title           VARCHAR(200),
  body            TEXT,
  severity        VARCHAR(20) DEFAULT 'info',
  source          VARCHAR(80),
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications (user_id, read_at);

-- ─────────────────────────────────────────────
-- Attachments
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attachments (
  id              SERIAL PRIMARY KEY,
  resource_type   VARCHAR(60),
  resource_id     INTEGER,
  filename        VARCHAR(255),
  original_name   VARCHAR(255),
  mimetype        VARCHAR(120),
  size_bytes      INTEGER,
  uploaded_by     VARCHAR(150),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_attachments_resource
  ON attachments (resource_type, resource_id);

-- ─────────────────────────────────────────────
-- Webhooks
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS webhooks (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(120),
  url             VARCHAR(500),
  secret          VARCHAR(120),
  events          TEXT,
  active          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id              SERIAL PRIMARY KEY,
  webhook_id      INTEGER,
  event           VARCHAR(120),
  payload         JSONB,
  status_code     INTEGER,
  response_body   TEXT,
  attempted_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook
  ON webhook_deliveries (webhook_id, attempted_at DESC);

-- ─────────────────────────────────────────────
-- Additional CRUD entities (10) — refugee/asylum domain
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS interpreters (
  id                   SERIAL PRIMARY KEY,
  interpreter_id       VARCHAR(50) UNIQUE,
  name                 VARCHAR(150),
  languages            VARCHAR(300),
  certifications       VARCHAR(300),
  base                 VARCHAR(150),
  status               VARCHAR(30) DEFAULT 'available',
  notes                TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attorneys (
  id                   SERIAL PRIMARY KEY,
  attorney_id          VARCHAR(50) UNIQUE,
  name                 VARCHAR(150),
  bar_state            VARCHAR(60),
  specialty            VARCHAR(200),
  case_count           INTEGER DEFAULT 0,
  status               VARCHAR(30) DEFAULT 'active',
  notes                TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS paralegals (
  id                   SERIAL PRIMARY KEY,
  paralegal_id         VARCHAR(50) UNIQUE,
  name                 VARCHAR(150),
  attorney_id          VARCHAR(50),
  base                 VARCHAR(150),
  case_count           INTEGER DEFAULT 0,
  status               VARCHAR(30) DEFAULT 'active',
  notes                TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS partner_orgs (
  id                   SERIAL PRIMARY KEY,
  org_id               VARCHAR(50) UNIQUE,
  name                 VARCHAR(200),
  country              VARCHAR(120),
  services             VARCHAR(300),
  contact              VARCHAR(200),
  status               VARCHAR(30) DEFAULT 'active',
  notes                TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS asylum_grants (
  id                   SERIAL PRIMARY KEY,
  grant_id             VARCHAR(50) UNIQUE,
  case_id              VARCHAR(50),
  status               VARCHAR(30) DEFAULT 'granted',
  granted_at           DATE,
  court                VARCHAR(150),
  basis                VARCHAR(200),
  notes                TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deportation_orders (
  id                   SERIAL PRIMARY KEY,
  order_id             VARCHAR(50) UNIQUE,
  case_id              VARCHAR(50),
  issued_at            DATE,
  removal_country      VARCHAR(120),
  status               VARCHAR(30) DEFAULT 'final',
  appeal_status        VARCHAR(60),
  notes                TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS family_members (
  id                   SERIAL PRIMARY KEY,
  member_id            VARCHAR(50) UNIQUE,
  client_id            VARCHAR(50),
  name                 VARCHAR(150),
  relationship         VARCHAR(60),
  location             VARCHAR(200),
  status               VARCHAR(30) DEFAULT 'separated',
  notes                TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sponsors (
  id                   SERIAL PRIMARY KEY,
  sponsor_id           VARCHAR(50) UNIQUE,
  client_id            VARCHAR(50),
  name                 VARCHAR(150),
  location             VARCHAR(200),
  sponsor_status       VARCHAR(60),
  status               VARCHAR(30) DEFAULT 'active',
  notes                TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS court_calendars (
  id                   SERIAL PRIMARY KEY,
  calendar_id          VARCHAR(50) UNIQUE,
  court                VARCHAR(150),
  date                 DATE,
  case_count           INTEGER DEFAULT 0,
  status               VARCHAR(30) DEFAULT 'open',
  judge                VARCHAR(150),
  notes                TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id                   SERIAL PRIMARY KEY,
  entry_id             VARCHAR(50) UNIQUE,
  actor                VARCHAR(150),
  target               VARCHAR(200),
  action               VARCHAR(120),
  result               VARCHAR(60),
  ts                   TIMESTAMPTZ,
  notes                TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);
