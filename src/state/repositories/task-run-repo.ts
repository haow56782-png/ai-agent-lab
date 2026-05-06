import type { Database } from "../db.js";
import type { TaskRunRecord, TaskRunStatus } from "../types.js";

export class TaskRunRepository {
  constructor(private db: Database) {}

  async init(): Promise<void> {
    await this.db.exec(`
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
      )
    `);
    await this.db.exec(
      "CREATE INDEX IF NOT EXISTS idx_task_runs_session ON task_runs(session_id)",
    );
  }

  async save(run: TaskRunRecord): Promise<void> {
    await this.db.run(
      `INSERT OR REPLACE INTO task_runs (id, session_id, task_id, status, started_at, ended_at, latency_ms, error)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        run.id,
        run.sessionId,
        run.taskId,
        run.status,
        run.startedAt,
        run.endedAt ?? null,
        run.latencyMs ?? null,
        run.error ?? null,
      ],
    );
  }

  async listBySession(sessionId: string): Promise<TaskRunRecord[]> {
    const rows = await this.db.all<{
      id: string;
      session_id: string;
      task_id: string;
      status: string;
      started_at: string;
      ended_at: string | null;
      latency_ms: number | null;
      error: string | null;
    }>(
      "SELECT * FROM task_runs WHERE session_id = ? ORDER BY started_at ASC",
      [sessionId],
    );
    return rows.map((r) => ({
      id: r.id,
      sessionId: r.session_id,
      taskId: r.task_id,
      status: r.status as TaskRunStatus,
      startedAt: r.started_at,
      endedAt: r.ended_at ?? undefined,
      latencyMs: r.latency_ms ?? undefined,
      error: r.error ?? undefined,
    }));
  }
}
