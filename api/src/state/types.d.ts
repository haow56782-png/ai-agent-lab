/**
 * VIB AI — State Layer Model Types
 *
 * Runtime state models for sessions, workflow runs, task runs,
 * eval history, trace spans, and metrics snapshots.
 * All types use ISO-8601 strings for datetime fields.
 */
export interface SessionRecord {
    id: string;
    traceId?: string;
    startedAt: string;
    endedAt?: string;
    metadata?: string;
}
export type WorkflowStatus = "running" | "completed" | "failed";
export interface WorkflowRunRecord {
    id: string;
    sessionId: string;
    task: string;
    plan?: string;
    output?: string;
    review?: string;
    refined?: string;
    stages: number;
    stageStatus?: string;
    status: WorkflowStatus;
    startedAt: string;
    endedAt?: string;
    totalLatencyMs?: number;
}
export type TaskRunStatus = "pending" | "running" | "completed" | "failed";
export interface TaskRunRecord {
    id: string;
    sessionId: string;
    taskId: string;
    status: TaskRunStatus;
    startedAt: string;
    endedAt?: string;
    latencyMs?: number;
    error?: string;
}
export interface EvalHistoryRecord {
    id: string;
    sessionId?: string;
    scenario: string;
    result: string;
    totalTasks: number;
    passed: number;
    failed: number;
    avgScore?: number;
    runAt: string;
}
export interface TraceSpanRecord {
    id: string;
    traceId: string;
    spanId: string;
    parentSpanId?: string;
    name: string;
    startMs: number;
    endMs?: number;
    durationMs?: number;
    metadata?: string;
}
export interface MetricsSnapshotRecord {
    id: string;
    sessionId?: string;
    model: string;
    llmCalls: number;
    toolCalls: number;
    totalTokens: number;
    avgLatencyMs?: number;
    successRate?: number;
    snapshotAt: string;
}
export interface StateStore {
    /** Initialize storage — create tables, run migrations. */
    init(): Promise<void>;
    /** Close storage connection. */
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
//# sourceMappingURL=types.d.ts.map