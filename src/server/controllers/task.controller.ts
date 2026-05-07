import type { Request, Response, NextFunction } from "express";
import { getTask } from "../services/task.service.js";
import { AppError, ERROR_CODES } from "../middleware/error-handler.js";
import type { TaskStore } from "../stores/types.js";

export function getTaskHandler(taskStore: TaskStore) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const task = await getTask(req.params.taskId as string, taskStore);
      if (!task) {
        throw new AppError(404, ERROR_CODES.TASK_NOT_FOUND, `Task ${req.params.taskId as string} not found`);
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
    } catch (err) {
      next(err);
    }
  };
}
