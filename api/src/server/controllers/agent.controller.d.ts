import type { Request, Response, NextFunction } from "express";
import type { TaskStore } from "../stores/types.js";
/**
 * POST /api/agent/analyze
 *
 * Billing notes:
 * - This endpoint does NOT charge credits. It only creates a task record
 *   and triggers async LLM analysis.
 * - This endpoint is NOT idempotent (each call creates a new taskId).
 * - Credit charges (if any) happen downstream at signal generation time
 *   (see task.service.ts -> createSignalFromTask), where idempotency is
 *   guaranteed by the task status machine lock (ANALYZING → COMPLETED
 *   transition happens at most once).
 */
export declare function analyzeHandler(taskStore: TaskStore): (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=agent.controller.d.ts.map