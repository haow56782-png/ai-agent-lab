import type { Database } from "../db.js";
import type { SessionRecord } from "../types.js";

export class SessionRepository {
  constructor(private db: Database) {}

  async init(): Promise<void> {
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        trace_id TEXT,
        started_at TEXT NOT NULL,
        ended_at TEXT,
        metadata TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
  }

  async save(session: SessionRecord): Promise<void> {
    await this.db.run(
      `INSERT OR REPLACE INTO sessions (id, trace_id, started_at, ended_at, metadata)
       VALUES (?, ?, ?, ?, ?)`,
      [
        session.id,
        session.traceId ?? null,
        session.startedAt,
        session.endedAt ?? null,
        session.metadata ?? null,
      ],
    );
  }

  async load(id: string): Promise<SessionRecord | null> {
    const row = await this.db.get<{
      id: string;
      trace_id: string | null;
      started_at: string;
      ended_at: string | null;
      metadata: string | null;
    }>("SELECT * FROM sessions WHERE id = ?", [id]);
    if (!row) return null;
    return {
      id: row.id,
      traceId: row.trace_id ?? undefined,
      startedAt: row.started_at,
      endedAt: row.ended_at ?? undefined,
      metadata: row.metadata ?? undefined,
    };
  }

  async list(limit = 50, offset = 0): Promise<SessionRecord[]> {
    const rows = await this.db.all<{
      id: string;
      trace_id: string | null;
      started_at: string;
      ended_at: string | null;
      metadata: string | null;
    }>("SELECT * FROM sessions ORDER BY started_at DESC LIMIT ? OFFSET ?", [limit, offset]);
    return rows.map((r) => ({
      id: r.id,
      traceId: r.trace_id ?? undefined,
      startedAt: r.started_at,
      endedAt: r.ended_at ?? undefined,
      metadata: r.metadata ?? undefined,
    }));
  }
}
