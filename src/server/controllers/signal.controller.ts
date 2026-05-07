import type { Request, Response, NextFunction } from "express";
import { getSignal } from "../services/signal.service.js";
import { AppError, ERROR_CODES } from "../middleware/error-handler.js";
import type { SignalStore } from "../stores/types.js";

export function getSignalHandler(signalStore: SignalStore) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const signal = await getSignal(req.params.signalId as string, signalStore);
      if (!signal) {
        throw new AppError(404, ERROR_CODES.SIGNAL_NOT_FOUND, `Signal ${req.params.signalId as string} not found`);
      }

      res.json({
        signalId: signal.signalId,
        taskId: signal.taskId,
        status: signal.status,
        summary: signal.summary,
        confidence: signal.confidence,
        createdAt: signal.createdAt,
      });
    } catch (err) {
      next(err);
    }
  };
}
