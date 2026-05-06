/**
 * VIB AI — In-Memory StateStore (for testing)
 *
 * Implements StateStore using plain Maps. No SQL, no I/O.
 * All data is lost on process exit — use SqliteStateStore for persistence.
 */

import type {
  StateStore,
  SessionRecord,
  WorkflowRunRecord,
  TaskRunRecord,
  EvalHistoryRecord,
  TraceSpanRecord,
  MetricsSnapshotRecord,
} from "./types.js";

export class MemoryStateStore implements StateStore {
  private sessions = new Map<string, SessionRecord>();
  private workflowRuns: WorkflowRunRecord[] = [];
  private taskRuns: TaskRunRecord[] = [];
  private evalHistory: EvalHistoryRecord[] = [];
  private traceSpans: TraceSpanRecord[] = [];
  private metricsSnapshots: MetricsSnapshotRecord[] = [];

  async init(): Promise<void> {
    // No-op for in-memory
  }

  async close(): Promise<void> {
    this.sessions.clear();
    this.workflowRuns = [];
    this.taskRuns = [];
    this.evalHistory = [];
    this.traceSpans = [];
    this.metricsSnapshots = [];
  }

  // ─── Sessions ─────────────────────────────────────────

  async saveSession(session: SessionRecord): Promise<void> {
    this.sessions.set(session.id, { ...session });
  }

  async loadSession(id: string): Promise<SessionRecord | null> {
    return this.sessions.get(id) ?? null;
  }

  async listSessions(limit = 50, offset = 0): Promise<SessionRecord[]> {
    return Array.from(this.sessions.values())
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .slice(offset, offset + limit);
  }

  // ─── Workflow Runs ────────────────────────────────────

  async saveWorkflowRun(run: WorkflowRunRecord): Promise<void> {
    const idx = this.workflowRuns.findIndex((r) => r.id === run.id);
    if (idx >= 0) {
      this.workflowRuns[idx] = { ...run };
    } else {
      this.workflowRuns.push({ ...run });
    }
  }

  async listWorkflowRuns(limit = 50): Promise<WorkflowRunRecord[]> {
    return [...this.workflowRuns]
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .slice(0, limit);
  }

  // ─── Task Runs ────────────────────────────────────────

  async saveTaskRun(run: TaskRunRecord): Promise<void> {
    this.taskRuns.push({ ...run });
  }

  async listTaskRuns(sessionId: string): Promise<TaskRunRecord[]> {
    return this.taskRuns
      .filter((r) => r.sessionId === sessionId)
      .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  }

  // ─── Eval History ─────────────────────────────────────

  async appendEvalHistory(entry: EvalHistoryRecord): Promise<void> {
    this.evalHistory.push({ ...entry });
  }

  async listEvalHistory(limit = 50): Promise<EvalHistoryRecord[]> {
    return [...this.evalHistory]
      .sort((a, b) => b.runAt.localeCompare(a.runAt))
      .slice(0, limit);
  }

  // ─── Trace Spans ──────────────────────────────────────

  async saveTraceSpan(span: TraceSpanRecord): Promise<void> {
    this.traceSpans.push({ ...span });
  }

  async queryRecentTraces(limit = 50): Promise<TraceSpanRecord[]> {
    return [...this.traceSpans]
      .sort((a, b) => b.startMs - a.startMs)
      .slice(0, limit);
  }

  async queryTracesByTraceId(traceId: string): Promise<TraceSpanRecord[]> {
    return this.traceSpans
      .filter((s) => s.traceId === traceId)
      .sort((a, b) => a.startMs - b.startMs);
  }

  // ─── Metrics Snapshots ────────────────────────────────

  async saveMetricsSnapshot(snapshot: MetricsSnapshotRecord): Promise<void> {
    this.metricsSnapshots.push({ ...snapshot });
  }

  async listMetricsSnapshots(sessionId?: string, limit = 50): Promise<MetricsSnapshotRecord[]> {
    let list = this.metricsSnapshots;
    if (sessionId) {
      list = list.filter((s) => s.sessionId === sessionId);
    }
    return [...list]
      .sort((a, b) => b.snapshotAt.localeCompare(a.snapshotAt))
      .slice(0, limit);
  }
}
