export class SessionRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async init() {
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
    async save(session) {
        await this.db.run(`INSERT OR REPLACE INTO sessions (id, trace_id, started_at, ended_at, metadata)
       VALUES (?, ?, ?, ?, ?)`, [
            session.id,
            session.traceId ?? null,
            session.startedAt,
            session.endedAt ?? null,
            session.metadata ?? null,
        ]);
    }
    async load(id) {
        const row = await this.db.get("SELECT * FROM sessions WHERE id = ?", [id]);
        if (!row)
            return null;
        return {
            id: row.id,
            traceId: row.trace_id ?? undefined,
            startedAt: row.started_at,
            endedAt: row.ended_at ?? undefined,
            metadata: row.metadata ?? undefined,
        };
    }
    async list(limit = 50, offset = 0) {
        const rows = await this.db.all("SELECT * FROM sessions ORDER BY started_at DESC LIMIT ? OFFSET ?", [limit, offset]);
        return rows.map((r) => ({
            id: r.id,
            traceId: r.trace_id ?? undefined,
            startedAt: r.started_at,
            endedAt: r.ended_at ?? undefined,
            metadata: r.metadata ?? undefined,
        }));
    }
}
//# sourceMappingURL=session-repo.js.map