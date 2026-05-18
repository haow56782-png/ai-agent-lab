import pg from "pg";
const { Pool } = pg;
let pool = null;
export function getPool() {
    if (!pool) {
        pool = new Pool({
            connectionString: process.env.DATABASE_URL || "postgresql://paper:paper@localhost:5432/paper_formatter",
            max: 20,
            idleTimeoutMillis: 30_000,
            connectionTimeoutMillis: 5_000,
        });
        pool.on("error", (err) => {
            console.error("[db] Unexpected pool error:", err.message);
        });
    }
    return pool;
}
export async function query(text, params) {
    const client = await getPool().connect();
    try {
        return await client.query(text, params);
    }
    finally {
        client.release();
    }
}
export async function ensureSchema() {
    const sql = `
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    CREATE TABLE IF NOT EXISTS documents (
      doc_id          VARCHAR(50) PRIMARY KEY,
      canonical_document_id VARCHAR(100) NOT NULL DEFAULT uuid_generate_v4()::text,
      filename        VARCHAR(500) NOT NULL,
      size_bytes      BIGINT       NOT NULL,
      sha256          VARCHAR(64)  NOT NULL,
      file_type       VARCHAR(10)  NOT NULL,
      page_count      INT,
      is_scanned_pdf  BOOLEAN DEFAULT FALSE,
      created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS jobs (
      job_id          VARCHAR(50) PRIMARY KEY,
      job_type        VARCHAR(20)  NOT NULL,
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

    CREATE TABLE IF NOT EXISTS school_profiles (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id       VARCHAR(100) NOT NULL,
      name            VARCHAR(200) NOT NULL DEFAULT '',
      version         VARCHAR(20)  NOT NULL,
      effective_from  DATE         NOT NULL,
      effective_to    DATE,
      faculty         VARCHAR(200),
      major           VARCHAR(200),
      gb_version      VARCHAR(20)  NOT NULL DEFAULT 'GB/T 7714-2015',
      rules_json      JSONB        NOT NULL DEFAULT '[]',
      style_map       JSONB        NOT NULL DEFAULT '[]',
      source_type     VARCHAR(20)  NOT NULL DEFAULT 'manual',
      source_hash     VARCHAR(64),
      upload_count    INTEGER      NOT NULL DEFAULT 0,
      created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS document_profiles (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      doc_id          VARCHAR(50) REFERENCES documents(doc_id),
      school_id       VARCHAR(100) NOT NULL,
      profile_id      VARCHAR(100),
      confidence      FLOAT,
      created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_doc_profiles_unique ON document_profiles(doc_id, school_id);

    CREATE TABLE IF NOT EXISTS school_rule_sets (
      rule_set_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      school_id       VARCHAR(100) NOT NULL,
      school_name     VARCHAR(200) NOT NULL,
      version         VARCHAR(40)  NOT NULL,
      effective_from  DATE         NOT NULL,
      effective_to    DATE,
      source_type     VARCHAR(32)  NOT NULL DEFAULT 'seed',
      source_hash     VARCHAR(64),
      rules_cache     JSONB        NOT NULL DEFAULT '[]',
      style_cache     JSONB        NOT NULL DEFAULT '[]',
      created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      UNIQUE (school_id, version)
    );

    CREATE TABLE IF NOT EXISTS school_rules (
      rule_pk              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      rule_set_id          UUID NOT NULL REFERENCES school_rule_sets(rule_set_id) ON DELETE CASCADE,
      school_id            VARCHAR(100) NOT NULL,
      rule_id              VARCHAR(160) NOT NULL,
      rule_name            VARCHAR(240) NOT NULL,
      rule_source          VARCHAR(32) NOT NULL DEFAULT 'school',
      rule_level           VARCHAR(32) NOT NULL DEFAULT 'school',
      rule_type            VARCHAR(32) NOT NULL DEFAULT 'format',
      cache_kind           VARCHAR(20) NOT NULL DEFAULT 'rule',
      category             VARCHAR(120) NOT NULL,
      category_code        VARCHAR(20),
      thesis_subset        VARCHAR(80) NOT NULL,
      target_object        VARCHAR(120) NOT NULL,
      ui_section           VARCHAR(80) NOT NULL,
      condition_json       JSONB NOT NULL DEFAULT '{}',
      expected_format_json JSONB NOT NULL DEFAULT '{}',
      priority             INTEGER NOT NULL DEFAULT 0,
      conflict_policy      VARCHAR(80) NOT NULL DEFAULT 'warn_on_conflict',
      warning_code         VARCHAR(120),
      fixable              BOOLEAN NOT NULL DEFAULT TRUE,
      auto_fix_strategy    VARCHAR(120) NOT NULL DEFAULT 'profile_default',
      evidence_json        JSONB NOT NULL DEFAULT '{}',
      raw_rule_json        JSONB NOT NULL DEFAULT '{}',
      created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (rule_set_id, rule_id)
    );

    CREATE TABLE IF NOT EXISTS rule_snapshots (
      snapshot_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      document_id      VARCHAR(100),
      job_id           VARCHAR(50) REFERENCES jobs(job_id),
      finding_id       VARCHAR(100),
      school_id        VARCHAR(100) NOT NULL,
      rule_set_id      UUID REFERENCES school_rule_sets(rule_set_id),
      rule_id          VARCHAR(160) NOT NULL,
      rule_payload     JSONB NOT NULL,
      snapshot_context VARCHAR(60) NOT NULL DEFAULT 'analyze',
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE school_rules ADD COLUMN IF NOT EXISTS cache_kind VARCHAR(20) NOT NULL DEFAULT 'rule';

    CREATE INDEX IF NOT EXISTS idx_school_rule_sets_school ON school_rule_sets(school_id);
    CREATE INDEX IF NOT EXISTS idx_school_rule_sets_effective ON school_rule_sets(school_id, effective_from DESC);
    CREATE INDEX IF NOT EXISTS idx_school_rule_sets_source ON school_rule_sets(source_type);
    CREATE INDEX IF NOT EXISTS idx_school_rules_school_rule ON school_rules(school_id, rule_id);
    CREATE INDEX IF NOT EXISTS idx_school_rules_rule_set ON school_rules(rule_set_id);
    CREATE INDEX IF NOT EXISTS idx_school_rules_subset ON school_rules(thesis_subset);
    CREATE INDEX IF NOT EXISTS idx_school_rules_target ON school_rules(target_object);
    CREATE INDEX IF NOT EXISTS idx_school_rules_category ON school_rules(category_code, category);
    CREATE INDEX IF NOT EXISTS idx_school_rules_source_level ON school_rules(rule_source, rule_level);
    CREATE INDEX IF NOT EXISTS idx_school_rules_cache_kind ON school_rules(rule_set_id, cache_kind);
    CREATE INDEX IF NOT EXISTS idx_rule_snapshots_document ON rule_snapshots(document_id);
    CREATE INDEX IF NOT EXISTS idx_rule_snapshots_job ON rule_snapshots(job_id);
    CREATE INDEX IF NOT EXISTS idx_rule_snapshots_finding ON rule_snapshots(finding_id);
    CREATE INDEX IF NOT EXISTS idx_rule_snapshots_rule ON rule_snapshots(school_id, rule_id);

    CREATE TABLE IF NOT EXISTS findings (
      finding_id      VARCHAR(100) PRIMARY KEY,
      job_id          VARCHAR(50) REFERENCES jobs(job_id),
      document_id     VARCHAR(50) NOT NULL,
      document_version INT NOT NULL DEFAULT 1,
      rule_id         VARCHAR(120) NOT NULL,
      rule_group      VARCHAR(120),
      severity        VARCHAR(2) NOT NULL,
      status          VARCHAR(32) NOT NULL DEFAULT 'pending',
      payload_json    JSONB NOT NULL,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS audit_records (
      audit_id        VARCHAR(100) PRIMARY KEY,
      target_type     VARCHAR(32) NOT NULL,
      target_id       VARCHAR(100) NOT NULL,
      actor_id        VARCHAR(100) NOT NULL,
      actor_role      VARCHAR(32) NOT NULL,
      action          VARCHAR(40) NOT NULL,
      from_state      VARCHAR(40),
      to_state        VARCHAR(40),
      snapshot_ref    VARCHAR(200),
      metadata        JSONB,
      timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_findings_document ON findings(document_id);
    CREATE INDEX IF NOT EXISTS idx_findings_job ON findings(job_id);
    CREATE INDEX IF NOT EXISTS idx_findings_status ON findings(status);
    CREATE INDEX IF NOT EXISTS idx_findings_severity ON findings(severity);
    CREATE INDEX IF NOT EXISTS idx_audit_target ON audit_records(target_type, target_id);

    CREATE TABLE IF NOT EXISTS share_reports (
      share_id        VARCHAR(50) PRIMARY KEY,
      file_id         VARCHAR(50) NOT NULL,
      check_result_id VARCHAR(50) NOT NULL,
      source_job_id   VARCHAR(50) REFERENCES jobs(job_id),
      doc_id          VARCHAR(50) REFERENCES documents(doc_id),
      profile_id      VARCHAR(100),
      payload_json    JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
    CREATE INDEX IF NOT EXISTS idx_jobs_doc    ON jobs(doc_id);
    CREATE INDEX IF NOT EXISTS idx_share_reports_doc ON share_reports(doc_id);
    CREATE INDEX IF NOT EXISTS idx_share_reports_job ON share_reports(source_job_id);

    ALTER TABLE documents ADD COLUMN IF NOT EXISTS canonical_document_id VARCHAR(100);
    UPDATE documents
       SET canonical_document_id = uuid_generate_v4()::text
     WHERE canonical_document_id IS NULL OR canonical_document_id = '';
    ALTER TABLE documents ALTER COLUMN canonical_document_id SET NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_canonical_document_id ON documents(canonical_document_id);
    UPDATE findings AS f
       SET document_id = d.canonical_document_id,
           payload_json = jsonb_set(f.payload_json, '{document_id}', to_jsonb(d.canonical_document_id))
      FROM documents AS d
     WHERE f.document_id = d.doc_id;

    -- Migration: ensure new columns on school_profiles (safe to re-run)
    ALTER TABLE school_profiles ADD COLUMN IF NOT EXISTS name VARCHAR(200) NOT NULL DEFAULT '';
    ALTER TABLE school_profiles ADD COLUMN IF NOT EXISTS upload_count INTEGER NOT NULL DEFAULT 0;
  `;
    const client = await getPool().connect();
    try {
        await client.query(sql);
        console.log("[db] Schema ensured");
    }
    catch (err) {
        console.error("[db] Schema initialization error:", err.message);
        throw err;
    }
    finally {
        client.release();
    }
}
export async function closePool() {
    if (pool) {
        await pool.end();
        pool = null;
        console.log("[db] Pool closed");
    }
}
