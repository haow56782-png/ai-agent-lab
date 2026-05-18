/**
 * VIB AI — SqliteStateStore Builder
 *
 * Composes all repositories with a SqliteDatabase to create
 * a full StateStore implementation backed by SQLite.
 */
import type { Database } from "../db.js";
import type { StateStore, SessionRecord, WorkflowRunRecord, TaskRunRecord, EvalHistoryRecord, TraceSpanRecord, MetricsSnapshotRecord } from "../types.js";
declare function generateId(): string;
export declare class SqliteStateStore implements StateStore {
    private db;
    private initialized;
    private sessions;
    private workflowRuns;
    private taskRuns;
    private evalHistory;
    private traceSpans;
    private metricsSnapshots;
    constructor(db: Database);
    init(): Promise<void>;
    close(): Promise<void>;
    /** Get the current schema version. */
    getSchemaVersion(): Promise<number>;
    /** Number of migrations applied on last init. */
    migrationsApplied: number;
    saveSession(session: SessionRecord): Promise<void>;
    loadSession(id: string): Promise<SessionRecord | null>;
    listSessions(limit?: number, offset?: number): Promise<SessionRecord[]>;
    saveWorkflowRun(run: WorkflowRunRecord): Promise<void>;
    listWorkflowRuns(limit?: number): Promise<WorkflowRunRecord[]>;
    saveTaskRun(run: TaskRunRecord): Promise<void>;
    listTaskRuns(sessionId: string): Promise<TaskRunRecord[]>;
    appendEvalHistory(entry: EvalHistoryRecord): Promise<void>;
    listEvalHistory(limit?: number): Promise<EvalHistoryRecord[]>;
    saveTraceSpan(span: TraceSpanRecord): Promise<void>;
    queryRecentTraces(limit?: number): Promise<TraceSpanRecord[]>;
    queryTracesByTraceId(traceId: string): Promise<TraceSpanRecord[]>;
    saveMetricsSnapshot(snapshot: MetricsSnapshotRecord): Promise<void>;
    listMetricsSnapshots(sessionId?: string, limit?: number): Promise<MetricsSnapshotRecord[]>;
}
export { generateId };
//# sourceMappingURL=index.d.ts.map