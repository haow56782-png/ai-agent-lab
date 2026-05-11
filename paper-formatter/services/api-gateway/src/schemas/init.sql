-- Paper Formatter — Database Initialization

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── School Profiles ──
CREATE TABLE school_profiles (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id   VARCHAR(100) NOT NULL,
  version     VARCHAR(20)  NOT NULL,
  effective_from DATE      NOT NULL,
  effective_to   DATE,
  faculty     VARCHAR(200),
  major       VARCHAR(200),
  gb_version  VARCHAR(20)  NOT NULL DEFAULT 'GB/T 7714-2015',
  rules_json  JSONB        NOT NULL DEFAULT '[]',
  style_map   JSONB        NOT NULL DEFAULT '[]',
  source_type VARCHAR(20)  NOT NULL DEFAULT 'manual',
  source_hash VARCHAR(64),
  verified_by VARCHAR(100),
  verified_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_school ON school_profiles(school_id, version);

-- ── Template Assets ──
CREATE TABLE template_assets (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id    UUID REFERENCES school_profiles(id),
  source_type   VARCHAR(20)  NOT NULL,  -- template | model
  source_hash   VARCHAR(64)  NOT NULL,
  license_note  TEXT,
  parsed_style  JSONB,
  file_path     VARCHAR(500),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Documents ──
CREATE TABLE documents (
  doc_id          VARCHAR(50) PRIMARY KEY,
  canonical_document_id VARCHAR(100) NOT NULL DEFAULT uuid_generate_v4()::text,
  filename        VARCHAR(500) NOT NULL,
  size_bytes      BIGINT       NOT NULL,
  sha256          VARCHAR(64)  NOT NULL,
  file_type       VARCHAR(10)  NOT NULL,  -- docx | pdf
  page_count      INT,
  is_scanned_pdf  BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_documents_canonical_document_id ON documents(canonical_document_id);

-- ── Jobs ──
CREATE TABLE jobs (
  job_id          VARCHAR(50) PRIMARY KEY,
  job_type        VARCHAR(20)  NOT NULL,  -- analyze | format
  status          VARCHAR(20)  NOT NULL DEFAULT 'queued',
  progress        INT          NOT NULL DEFAULT 0,
  stage           VARCHAR(100),
  doc_id          VARCHAR(50)  REFERENCES documents(doc_id),
  profile_id      VARCHAR(50),
  plan_id         VARCHAR(50),
  error_code      VARCHAR(50),
  error_message   TEXT,
  estimated_sec   INT,
  result_json     JSONB,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_doc    ON jobs(doc_id);

-- ── Share Reports ──
CREATE TABLE share_reports (
  share_id        VARCHAR(50) PRIMARY KEY,
  file_id         VARCHAR(50) NOT NULL,
  check_result_id VARCHAR(50) NOT NULL,
  source_job_id   VARCHAR(50) REFERENCES jobs(job_id),
  doc_id          VARCHAR(50) REFERENCES documents(doc_id),
  profile_id      VARCHAR(100),
  payload_json    JSONB        NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_share_reports_doc ON share_reports(doc_id);
CREATE INDEX idx_share_reports_job ON share_reports(source_job_id);

-- ── Finding-Centric Review Workbench ──
CREATE TABLE findings (
  finding_id       VARCHAR(100) PRIMARY KEY,
  job_id           VARCHAR(50) REFERENCES jobs(job_id),
  document_id      VARCHAR(50) NOT NULL,
  document_version INT NOT NULL DEFAULT 1,
  rule_id          VARCHAR(120) NOT NULL,
  rule_group       VARCHAR(120),
  severity         VARCHAR(2) NOT NULL,
  status           VARCHAR(32) NOT NULL DEFAULT 'pending',
  payload_json     JSONB NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_findings_document ON findings(document_id);
CREATE INDEX idx_findings_job ON findings(job_id);
CREATE INDEX idx_findings_status ON findings(status);
CREATE INDEX idx_findings_severity ON findings(severity);

CREATE TABLE audit_records (
  audit_id      VARCHAR(100) PRIMARY KEY,
  target_type   VARCHAR(32) NOT NULL,
  target_id     VARCHAR(100) NOT NULL,
  actor_id      VARCHAR(100) NOT NULL,
  actor_role    VARCHAR(32) NOT NULL,
  action        VARCHAR(40) NOT NULL,
  from_state    VARCHAR(40),
  to_state      VARCHAR(40),
  snapshot_ref  VARCHAR(200),
  metadata      JSONB,
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_target ON audit_records(target_type, target_id);

-- ── Validation Reports ──
CREATE TABLE validation_reports (
  report_id     VARCHAR(50) PRIMARY KEY,
  job_id        VARCHAR(50)  NOT NULL REFERENCES jobs(job_id),
  content_match BOOLEAN      NOT NULL DEFAULT TRUE,
  original_hash VARCHAR(64),
  output_hash   VARCHAR(64),
  pass_rate     FLOAT        NOT NULL DEFAULT 0,
  rule_results  JSONB,
  warnings      JSONB,
  errors        JSONB,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Feedbacks ──
CREATE TABLE feedbacks (
  feedback_id   VARCHAR(50) PRIMARY KEY,
  job_id        VARCHAR(50)  REFERENCES jobs(job_id),
  feedback_type VARCHAR(50)  NOT NULL,
  detail_json   JSONB,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Schema Migrations ──
CREATE TABLE schema_migrations (
  version   VARCHAR(50) PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
