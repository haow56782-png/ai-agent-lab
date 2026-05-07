import type { Request, Response, NextFunction } from "express";

export interface ApiError {
  error: {
    code: string;
    message: string;
    requestId: string;
  };
}

export const ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  TASK_NOT_FOUND: "TASK_NOT_FOUND",
  SIGNAL_NOT_FOUND: "SIGNAL_NOT_FOUND",
  REPORT_NOT_FOUND: "REPORT_NOT_FOUND",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        requestId: req.requestId,
      },
    } satisfies ApiError);
    return;
  }

  res.status(500).json({
    error: {
      code: ERROR_CODES.INTERNAL_ERROR,
      message: "Internal server error",
      requestId: req.requestId,
    },
  } satisfies ApiError);
}
