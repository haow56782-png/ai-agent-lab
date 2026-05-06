/**
 * VIB AI — SqliteStateStore Builder
 *
 * Composes all repositories with a SqliteDatabase to create
 * a full StateStore implementation backed by SQLite.
 */

import { randomBytes } from "node:crypto";
import type { Database } from "../db.js";
import type {
  StateStore,
  SessionRecord,
  WorkflowRunRecord,
  TaskRunRecord,
  EvalHistoryRecord,
  TraceSpanRecord,
  MetricsSnapshotRecord,
} from "../types.js";
import { SessionRepository } from "./session-repo.js";
import { WorkflowRunRepository } from "./workflow-run-repo.js";
import { TaskRunRepository } from "./task-run-repo.js";
import { EvalHistoryRepository } from "./eval-history-repo.js";
import { TraceSpanRepository } from "./trace-span-repo.js";
import { MetricsSnapshotRepository } from "./metrics-snapshot-repo.js";
import { runMigrations, getCurrentVersion } from "../migrations-runner.js";

function generateId(): string {
  return randomBytes(6).toString("hex");
}

export class SqliteStateStore implements StateStore {
  private initialized = false;
  private sessions: SessionRepository;
  private workflowRuns: WorkflowRunRepository;
  private taskRuns: TaskRunRepository;
  private evalHistory: EvalHistoryRepository;
  private traceSpans: TraceSpanRepository;
  private metricsSnapshots: MetricsSnapshotRepository;

  constructor(private db: Database) {
    this.sessions = new SessionRepository(db);
    this.workflowRuns = new WorkflowRunRepository(db);
    this.taskRuns = new TaskRunRepository(db);
    this.evalHistory = new EvalHistoryRepository(db);
    this.traceSpans = new TraceSpanRepository(db);
    this.metricsSnapshots = new MetricsSnapshotRepository(db);
  }

  async init(): Promise<void> {
    await this.db.connect();
    const applied = await runMigrations(this.db);
    this.initialized = true;
  }

  async close(): Promise<void> {
    await this.db.close();
    this.initialized = false;
  }

  /** Get the current schema version. */
  async getSchemaVersion(): Promise<number> {
    return getCurrentVersion(this.db);
  }

  /** Number of migrations applied on last init. */
  migrationsApplied = 0;

  // ─── Sessions ─────────────────────────────────────────

  async saveSession(session: SessionRecord): Promise<void> {
    return this.sessions.save(session);
  }

  async loadSession(id: string): Promise<SessionRecord | null> {
    return this.sessions.load(id);
  }

  async listSessions(limit = 50, offset = 0): Promise<SessionRecord[]> {
    return this.sessions.list(limit, offset);
  }

  // ─── Workflow Runs ────────────────────────────────────

  async saveWorkflowRun(run: WorkflowRunRecord): Promise<void> {
    return this.workflowRuns.save(run);
  }

  async listWorkflowRuns(limit = 50): Promise<WorkflowRunRecord[]> {
    return this.workflowRuns.list(limit);
  }

  // ─── Task Runs ────────────────────────────────────────

  async saveTaskRun(run: TaskRunRecord): Promise<void> {
    return this.taskRuns.save(run);
  }

  async listTaskRuns(sessionId: string): Promise<TaskRunRecord[]> {
    return this.taskRuns.listBySession(sessionId);
  }

  // ─── Eval History ─────────────────────────────────────

  async appendEvalHistory(entry: EvalHistoryRecord): Promise<void> {
    return this.evalHistory.append(entry);
  }

  async listEvalHistory(limit = 50): Promise<EvalHistoryRecord[]> {
    return this.evalHistory.list(limit);
  }

  // ─── Trace Spans ──────────────────────────────────────

  async saveTraceSpan(span: TraceSpanRecord): Promise<void> {
    return this.traceSpans.save(span);
  }

  async queryRecentTraces(limit = 50): Promise<TraceSpanRecord[]> {
    return this.traceSpans.queryRecent(limit);
  }

  async queryTracesByTraceId(traceId: string): Promise<TraceSpanRecord[]> {
    return this.traceSpans.queryByTraceId(traceId);
  }

  // ─── Metrics Snapshots ────────────────────────────────

  async saveMetricsSnapshot(snapshot: MetricsSnapshotRecord): Promise<void> {
    return this.metricsSnapshots.save(snapshot);
  }

  async listMetricsSnapshots(
    sessionId?: string,
    limit = 50,
  ): Promise<MetricsSnapshotRecord[]> {
    return this.metricsSnapshots.list(sessionId, limit);
  }
}

export { generateId };
