export class EvalHistoryRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async init() {
        await this.db.exec(`
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
      )
    `);
        await this.db.exec("CREATE INDEX IF NOT EXISTS idx_eval_history_scenario ON eval_history(scenario)");
    }
    async append(entry) {
        await this.db.run(`INSERT INTO eval_history (id, session_id, scenario, result, total_tasks, passed, failed, avg_score, run_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            entry.id,
            entry.sessionId ?? null,
            entry.scenario,
            entry.result,
            entry.totalTasks,
            entry.passed,
            entry.failed,
            entry.avgScore ?? null,
            entry.runAt,
        ]);
    }
    async list(limit = 50) {
        const rows = await this.db.all("SELECT * FROM eval_history ORDER BY run_at DESC LIMIT ?", [limit]);
        return rows.map((r) => ({
            id: r.id,
            sessionId: r.session_id ?? undefined,
            scenario: r.scenario,
            result: r.result,
            totalTasks: r.total_tasks,
            passed: r.passed,
            failed: r.failed,
            avgScore: r.avg_score ?? undefined,
            runAt: r.run_at,
        }));
    }
}
//# sourceMappingURL=eval-history-repo.js.map