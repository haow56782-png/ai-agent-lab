/**
 * VIB AI — SqliteStateStore Builder
 *
 * Composes all repositories with a SqliteDatabase to create
 * a full StateStore implementation backed by SQLite.
 */
import { randomBytes } from "node:crypto";
import { SessionRepository } from "./session-repo.js";
import { WorkflowRunRepository } from "./workflow-run-repo.js";
import { TaskRunRepository } from "./task-run-repo.js";
import { EvalHistoryRepository } from "./eval-history-repo.js";
import { TraceSpanRepository } from "./trace-span-repo.js";
import { MetricsSnapshotRepository } from "./metrics-snapshot-repo.js";
import { runMigrations, getCurrentVersion } from "../migrations-runner.js";
function generateId() {
    return randomBytes(6).toString("hex");
}
export class SqliteStateStore {
    db;
    initialized = false;
    sessions;
    workflowRuns;
    taskRuns;
    evalHistory;
    traceSpans;
    metricsSnapshots;
    constructor(db) {
        this.db = db;
        this.sessions = new SessionRepository(db);
        this.workflowRuns = new WorkflowRunRepository(db);
        this.taskRuns = new TaskRunRepository(db);
        this.evalHistory = new EvalHistoryRepository(db);
        this.traceSpans = new TraceSpanRepository(db);
        this.metricsSnapshots = new MetricsSnapshotRepository(db);
    }
    async init() {
        await this.db.connect();
        const applied = await runMigrations(this.db);
        this.initialized = true;
    }
    async close() {
        await this.db.close();
        this.initialized = false;
    }
    /** Get the current schema version. */
    async getSchemaVersion() {
        return getCurrentVersion(this.db);
    }
    /** Number of migrations applied on last init. */
    migrationsApplied = 0;
    // ─── Sessions ─────────────────────────────────────────
    async saveSession(session) {
        return this.sessions.save(session);
    }
    async loadSession(id) {
        return this.sessions.load(id);
    }
    async listSessions(limit = 50, offset = 0) {
        return this.sessions.list(limit, offset);
    }
    // ─── Workflow Runs ────────────────────────────────────
    async saveWorkflowRun(run) {
        return this.workflowRuns.save(run);
    }
    async listWorkflowRuns(limit = 50) {
        return this.workflowRuns.list(limit);
    }
    // ─── Task Runs ────────────────────────────────────────
    async saveTaskRun(run) {
        return this.taskRuns.save(run);
    }
    async listTaskRuns(sessionId) {
        return this.taskRuns.listBySession(sessionId);
    }
    // ─── Eval History ─────────────────────────────────────
    async appendEvalHistory(entry) {
        return this.evalHistory.append(entry);
    }
    async listEvalHistory(limit = 50) {
        return this.evalHistory.list(limit);
    }
    // ─── Trace Spans ──────────────────────────────────────
    async saveTraceSpan(span) {
        return this.traceSpans.save(span);
    }
    async queryRecentTraces(limit = 50) {
        return this.traceSpans.queryRecent(limit);
    }
    async queryTracesByTraceId(traceId) {
        return this.traceSpans.queryByTraceId(traceId);
    }
    // ─── Metrics Snapshots ────────────────────────────────
    async saveMetricsSnapshot(snapshot) {
        return this.metricsSnapshots.save(snapshot);
    }
    async listMetricsSnapshots(sessionId, limit = 50) {
        return this.metricsSnapshots.list(sessionId, limit);
    }
}
export { generateId };
//# sourceMappingURL=index.js.map