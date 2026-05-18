/**
 * VIB AI — In-Memory StateStore (for testing)
 *
 * Implements StateStore using plain Maps. No SQL, no I/O.
 * All data is lost on process exit — use SqliteStateStore for persistence.
 */
import type { StateStore, SessionRecord, WorkflowRunRecord, TaskRunRecord, EvalHistoryRecord, TraceSpanRecord, MetricsSnapshotRecord } from "./types.js";
export declare class MemoryStateStore implements StateStore {
    private sessions;
    private workflowRuns;
    private taskRuns;
    private evalHistory;
    private traceSpans;
    private metricsSnapshots;
    init(): Promise<void>;
    close(): Promise<void>;
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
//# sourceMappingURL=memory-store.d.ts.map