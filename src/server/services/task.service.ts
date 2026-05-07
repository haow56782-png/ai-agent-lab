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

import { runAgent } from "./agent-runtime.service.js";
import type { TaskStore, TaskRecord, SignalStore, SignalRecord } from "../stores/types.js";

let taskCounter = 0;
let signalCounter = 0;

function generateTaskId(): string {
  taskCounter++;
  return `task_${Date.now().toString(36)}_${taskCounter}`;
}

function generateSignalId(): string {
  signalCounter++;
  return `signal_${Date.now().toString(36)}_${signalCounter}`;
}

export interface CreateTaskInput {
  url: string;
  gameId?: string;
  platform?: string;
  userId?: string;
}

/* Does NOT charge credits. See billing note at top of file. */
export async function createTask(
  input: CreateTaskInput,
  taskStore: TaskStore,
): Promise<TaskRecord> {
  const now = new Date().toISOString();
  const task: TaskRecord = {
    taskId: generateTaskId(),
    url: input.url,
    gameId: input.gameId,
    platform: input.platform,
    userId: input.userId || "demo-user",
    status: "CREATED",
    progress: 0,
    currentStep: "Task created",
    createdAt: now,
    updatedAt: now,
  };

  await taskStore.createTask(task);

  // Start analysis asynchronously (non-blocking)
  runAnalysis(task, taskStore).catch((err) => {
    taskStore.updateTask(task.taskId, {
      status: "FAILED",
      currentStep: `Error: ${err.message}`,
    });
  });

  return task;
}

async function runAnalysis(task: TaskRecord, taskStore: TaskStore): Promise<void> {
  await taskStore.updateTask(task.taskId, { status: "ANALYZING", progress: 30, currentStep: "Analyzing input" });

  // Build prompt from task input
  const prompt = buildPrompt(task);
  const result = await runAgent({ prompt, userId: task.userId });

  await taskStore.updateTask(task.taskId, {
    status: "COMPLETED",
    progress: 100,
    currentStep: "Analysis complete",
    result: result.output,
  });
}

function buildPrompt(task: TaskRecord): string {
  const parts = [`Analyze game site: ${task.url}`];
  if (task.gameId) parts.push(`Game ID: ${task.gameId}`);
  if (task.platform) parts.push(`Platform: ${task.platform}`);
  parts.push("Provide prediction, risk assessment, and recommendations.");
  return parts.join("\n");
}

export async function getTask(taskId: string, taskStore: TaskStore): Promise<TaskRecord | undefined> {
  return taskStore.getTask(taskId);
}

export async function createSignalFromTask(
  taskId: string,
  taskStore: TaskStore,
  signalStore: SignalStore,
): Promise<SignalRecord | undefined> {
  const task = await taskStore.getTask(taskId);
  if (!task || task.status !== "COMPLETED" || !task.result) return undefined;

  const now = new Date().toISOString();
  const signal: SignalRecord = {
    signalId: generateSignalId(),
    taskId: task.taskId,
    status: "ACTIVE",
    summary: task.result.slice(0, 200),
    confidence: 0.85,
    createdAt: now,
  };

  return signalStore.createSignal(signal);
}
