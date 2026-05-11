import type { Request, Response, NextFunction } from "express";

export interface AppError {
  statusCode: number;
  code: string;
  message: string;
  details?: { field: string; reason: string }[];
}

export function createError(statusCode: number, code: string, message: string, details?: AppError["details"]): AppError {
  return { statusCode, code, message, details };
}

export const ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  FILE_TOO_LARGE: "FILE_TOO_LARGE",
  UNSUPPORTED_FORMAT: "UNSUPPORTED_FORMAT",
  FILE_CORRUPTED: "FILE_CORRUPTED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  RATE_LIMITED: "RATE_LIMITED",
} as const;

export function errorHandler(err: Error | AppError, req: Request, res: Response, _next: NextFunction): void {
  if ("statusCode" in err) {
    res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details, requestId: (req as any).requestId },
    });
    return;
  }
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Internal server error", requestId: (req as any).requestId },
  });
}
