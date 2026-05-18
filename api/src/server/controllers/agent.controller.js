import { validateAnalyzeRequest } from "../schemas/agent.schema.js";
import { createTask } from "../services/task.service.js";
import { AppError, ERROR_CODES } from "../middleware/error-handler.js";
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
export function analyzeHandler(taskStore) {
    return async (req, res, next) => {
        try {
            const validation = validateAnalyzeRequest(req.body);
            if (!validation.valid) {
                throw new AppError(400, ERROR_CODES.VALIDATION_ERROR, validation.errors.join("; "));
            }
            const task = await createTask({
                url: req.body.url.trim(),
                gameId: req.body.gameId,
                platform: req.body.platform,
                userId: req.body.userId,
            }, taskStore);
            res.status(201).json({
                taskId: task.taskId,
                status: task.status,
                message: "Agent analysis task created",
            });
        }
        catch (err) {
            next(err);
        }
    };
}
//# sourceMappingURL=agent.controller.js.map