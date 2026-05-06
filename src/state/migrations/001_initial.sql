-- 001_initial: Core schema for Agent Runtime State Layer
-- Applied by migrations-runner.ts on first connect.

-- Meta table for migration tracking
CREATE TABLE IF NOT EXISTS _meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Seed schema version
INSERT OR IGNORE INTO _meta (key, value) VALUES ('schema_version', '0');

-- ─── Sessions ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  trace_id TEXT,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─── Workflow Runs ───────────────────────────────────

CREATE TABLE IF NOT EXISTS workflow_runs (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  task TEXT NOT NULL,
  plan TEXT,
  output TEXT,
  review TEXT,
  refined TEXT,
  stages INTEGER NOT NULL DEFAULT 0,
  stage_status TEXT,
  status TEXT NOT NULL DEFAULT 'running',
  started_at TEXT NOT NULL,
  ended_at TEXT,
  total_latency_ms INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_workflow_runs_session
  ON workflow_runs(session_id);

-- ─── Task Runs ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS task_runs (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  task_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  started_at TEXT NOT NULL,
  ended_at TEXT,
  latency_ms INTEGER,
  error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_task_runs_session
  ON task_runs(session_id);

-- ─── Eval History ────────────────────────────────────

CREATE TABLE IF NOT EXISTS eval_history (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  scenario TEXT NOT NULL,
  result TEXT NOT NULL,
  total_tasks INTEGER NOT NULL,
  passed INTEGER NOT NULL,
  failed INTEGER NOT NULL,
  avg_score REAL,
  run_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_eval_history_scenario
  ON eval_history(scenario);

-- ─── Trace Spans ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS trace_spans (
  id TEXT PRIMARY KEY,
  trace_id TEXT NOT NULL,
  span_id TEXT NOT NULL,
  parent_span_id TEXT,
  name TEXT NOT NULL,
  start_ms REAL NOT NULL,
  end_ms REAL,
  duration_ms REAL,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_trace_spans_trace
  ON trace_spans(trace_id);
CREATE INDEX IF NOT EXISTS idx_trace_spans_name
  ON trace_spans(name);

-- ─── Metrics Snapshots ───────────────────────────────

CREATE TABLE IF NOT EXISTS metrics_snapshots (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  model TEXT NOT NULL,
  llm_calls INTEGER NOT NULL DEFAULT 0,
  tool_calls INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  avg_latency_ms REAL,
  success_rate REAL,
  snapshot_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_metrics_snapshots_session
  ON metrics_snapshots(session_id);
