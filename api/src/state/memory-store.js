/**
 * VIB AI — In-Memory StateStore (for testing)
 *
 * Implements StateStore using plain Maps. No SQL, no I/O.
 * All data is lost on process exit — use SqliteStateStore for persistence.
 */
export class MemoryStateStore {
    sessions = new Map();
    workflowRuns = [];
    taskRuns = [];
    evalHistory = [];
    traceSpans = [];
    metricsSnapshots = [];
    async init() {
        // No-op for in-memory
    }
    async close() {
        this.sessions.clear();
        this.workflowRuns = [];
        this.taskRuns = [];
        this.evalHistory = [];
        this.traceSpans = [];
        this.metricsSnapshots = [];
    }
    // ─── Sessions ─────────────────────────────────────────
    async saveSession(session) {
        this.sessions.set(session.id, { ...session });
    }
    async loadSession(id) {
        return this.sessions.get(id) ?? null;
    }
    async listSessions(limit = 50, offset = 0) {
        return Array.from(this.sessions.values())
            .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
            .slice(offset, offset + limit);
    }
    // ─── Workflow Runs ────────────────────────────────────
    async saveWorkflowRun(run) {
        const idx = this.workflowRuns.findIndex((r) => r.id === run.id);
        if (idx >= 0) {
            this.workflowRuns[idx] = { ...run };
        }
        else {
            this.workflowRuns.push({ ...run });
        }
    }
    async listWorkflowRuns(limit = 50) {
        return [...this.workflowRuns]
            .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
            .slice(0, limit);
    }
    // ─── Task Runs ────────────────────────────────────────
    async saveTaskRun(run) {
        this.taskRuns.push({ ...run });
    }
    async listTaskRuns(sessionId) {
        return this.taskRuns
            .filter((r) => r.sessionId === sessionId)
            .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
    }
    // ─── Eval History ─────────────────────────────────────
    async appendEvalHistory(entry) {
        this.evalHistory.push({ ...entry });
    }
    async listEvalHistory(limit = 50) {
        return [...this.evalHistory]
            .sort((a, b) => b.runAt.localeCompare(a.runAt))
            .slice(0, limit);
    }
    // ─── Trace Spans ──────────────────────────────────────
    async saveTraceSpan(span) {
        this.traceSpans.push({ ...span });
    }
    async queryRecentTraces(limit = 50) {
        return [...this.traceSpans]
            .sort((a, b) => b.startMs - a.startMs)
            .slice(0, limit);
    }
    async queryTracesByTraceId(traceId) {
        return this.traceSpans
            .filter((s) => s.traceId === traceId)
            .sort((a, b) => a.startMs - b.startMs);
    }
    // ─── Metrics Snapshots ────────────────────────────────
    async saveMetricsSnapshot(snapshot) {
        this.metricsSnapshots.push({ ...snapshot });
    }
    async listMetricsSnapshots(sessionId, limit = 50) {
        let list = this.metricsSnapshots;
        if (sessionId) {
            list = list.filter((s) => s.sessionId === sessionId);
        }
        return [...list]
            .sort((a, b) => b.snapshotAt.localeCompare(a.snapshotAt))
            .slice(0, limit);
    }
}
//# sourceMappingURL=memory-store.js.map