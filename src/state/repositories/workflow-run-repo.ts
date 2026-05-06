import type { Database } from "../db.js";
import type { WorkflowRunRecord, WorkflowStatus } from "../types.js";

export class WorkflowRunRepository {
  constructor(private db: Database) {}

  async init(): Promise<void> {
    await this.db.exec(`
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
      )
    `);
    await this.db.exec(
      "CREATE INDEX IF NOT EXISTS idx_workflow_runs_session ON workflow_runs(session_id)",
    );
  }

  async save(run: WorkflowRunRecord): Promise<void> {
    await this.db.run(
      `INSERT OR REPLACE INTO workflow_runs
       (id, session_id, task, plan, output, review, refined, stages, stage_status, status, started_at, ended_at, total_latency_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        run.id,
        run.sessionId,
        run.task,
        run.plan ?? null,
        run.output ?? null,
        run.review ?? null,
        run.refined ?? null,
        run.stages,
        run.stageStatus ?? null,
        run.status,
        run.startedAt,
        run.endedAt ?? null,
        run.totalLatencyMs ?? null,
      ],
    );
  }

  async list(limit = 50): Promise<WorkflowRunRecord[]> {
    const rows = await this.db.all<{
      id: string;
      session_id: string;
      task: string;
      plan: string | null;
      output: string | null;
      review: string | null;
      refined: string | null;
      stages: number;
      stage_status: string | null;
      status: string;
      started_at: string;
      ended_at: string | null;
      total_latency_ms: number | null;
    }>("SELECT * FROM workflow_runs ORDER BY started_at DESC LIMIT ?", [limit]);
    return rows.map((r) => ({
      id: r.id,
      sessionId: r.session_id,
      task: r.task,
      plan: r.plan ?? undefined,
      output: r.output ?? undefined,
      review: r.review ?? undefined,
      refined: r.refined ?? undefined,
      stages: r.stages,
      stageStatus: r.stage_status ?? undefined,
      status: r.status as WorkflowStatus,
      startedAt: r.started_at,
      endedAt: r.ended_at ?? undefined,
      totalLatencyMs: r.total_latency_ms ?? undefined,
    }));
  }
}
