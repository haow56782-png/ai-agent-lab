import { getTask } from "../services/task.service.js";
import { AppError, ERROR_CODES } from "../middleware/error-handler.js";
export function getTaskHandler(taskStore) {
    return async (req, res, next) => {
        try {
            const task = await getTask(req.params.taskId, taskStore);
            if (!task) {
                throw new AppError(404, ERROR_CODES.TASK_NOT_FOUND, `Task ${req.params.taskId} not found`);
            }
            res.json({
                taskId: task.taskId,
                status: task.status,
                progress: task.progress,
                currentStep: task.currentStep,
                ...(task.result ? { result: task.result } : {}),
                createdAt: task.createdAt,
                updatedAt: task.updatedAt,
            });
        }
        catch (err) {
            next(err);
        }
    };
}
//# sourceMappingURL=task.controller.js.map