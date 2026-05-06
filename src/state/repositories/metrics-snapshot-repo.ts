import type { Database } from "../db.js";
import type { MetricsSnapshotRecord } from "../types.js";

export class MetricsSnapshotRepository {
  constructor(private db: Database) {}

  async init(): Promise<void> {
    await this.db.exec(`
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
      )
    `);
    await this.db.exec(
      "CREATE INDEX IF NOT EXISTS idx_metrics_snapshots_session ON metrics_snapshots(session_id)",
    );
  }

  async save(snapshot: MetricsSnapshotRecord): Promise<void> {
    await this.db.run(
      `INSERT INTO metrics_snapshots (id, session_id, model, llm_calls, tool_calls, total_tokens, avg_latency_ms, success_rate, snapshot_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        snapshot.id,
        snapshot.sessionId ?? null,
        snapshot.model,
        snapshot.llmCalls,
        snapshot.toolCalls,
        snapshot.totalTokens,
        snapshot.avgLatencyMs ?? null,
        snapshot.successRate ?? null,
        snapshot.snapshotAt,
      ],
    );
  }

  async list(sessionId?: string, limit = 50): Promise<MetricsSnapshotRecord[]> {
    let sql: string;
    let params: unknown[];
    if (sessionId) {
      sql =
        "SELECT * FROM metrics_snapshots WHERE session_id = ? ORDER BY snapshot_at DESC LIMIT ?";
      params = [sessionId, limit];
    } else {
      sql = "SELECT * FROM metrics_snapshots ORDER BY snapshot_at DESC LIMIT ?";
      params = [limit];
    }
    const rows = await this.db.all<{
      id: string;
      session_id: string | null;
      model: string;
      llm_calls: number;
      tool_calls: number;
      total_tokens: number;
      avg_latency_ms: number | null;
      success_rate: number | null;
      snapshot_at: string;
    }>(sql, params);
    return rows.map((r) => ({
      id: r.id,
      sessionId: r.session_id ?? undefined,
      model: r.model,
      llmCalls: r.llm_calls,
      toolCalls: r.tool_calls,
      totalTokens: r.total_tokens,
      avgLatencyMs: r.avg_latency_ms ?? undefined,
      successRate: r.success_rate ?? undefined,
      snapshotAt: r.snapshot_at,
    }));
  }
}
