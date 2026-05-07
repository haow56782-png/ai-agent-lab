import type { Request, Response, NextFunction } from "express";
import { logger } from "../../logger.js";

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = performance.now();
  res.on("finish", () => {
    const duration = Math.round(performance.now() - start);
    logger.info("api.request", {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: duration,
    });
  });
  next();
}
