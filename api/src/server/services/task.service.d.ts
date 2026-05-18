/**
 * Task Service — manages task lifecycle: create, run, query.
 *
 * ── Billing Architecture ──────────────────────────────────────────
 * There are three potential charging points in the system. This file
 * owns the first two; signal.service.ts owns the third.
 *
 *   1. Task creation (this file, createTask)
 *      Trigger: POST /api/agent/analyze
 *      Does NOT charge credits. Merely creates a record and kicks
 *      off async analysis. Non-idempotent by design — each call
 *      produces a distinct taskId.
 *
 *   2. Signal generation (this file, createSignalFromTask)
 *      Trigger: Task status reaches COMPLETED (state machine event)
 *      This is the PRIMARY charging point (professional signal).
 *      Idempotency mechanism: STATE MACHINE LOCK — the
 *      ANALYZING → COMPLETED transition fires at most once, so
 *      the charge is a side-effect of that single transition.
 *      IF credits are insufficient, the task should transition to
 *      a CREDITS_REQUIRED state instead (future work).
 *
 *   3. Report generation (report.service.ts)
 *      Trigger: TBD — at task completion or on-demand endpoint.
 *      Idempotency: TBD (state machine lock or idempotency-key).
 *
 * Reward signals (point 2 variant) are derived from the same
 * professional signal and do NOT incur a separate charge.
 * ──────────────────────────────────────────────────────────────────
 */
import type { TaskStore, TaskRecord, SignalStore, SignalRecord } from "../stores/types.js";
export interface CreateTaskInput {
    url: string;
    gameId?: string;
    platform?: string;
    userId?: string;
}
export declare function createTask(input: CreateTaskInput, taskStore: TaskStore): Promise<TaskRecord>;
export declare function getTask(taskId: string, taskStore: TaskStore): Promise<TaskRecord | undefined>;
export declare function createSignalFromTask(taskId: string, taskStore: TaskStore, signalStore: SignalStore): Promise<SignalRecord | undefined>;
//# sourceMappingURL=task.service.d.ts.map