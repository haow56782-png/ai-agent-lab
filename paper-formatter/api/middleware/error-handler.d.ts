import type { Request, Response, NextFunction } from "express";
export interface AppError {
    statusCode: number;
    code: string;
    message: string;
    details?: {
        field: string;
        reason: string;
    }[];
}
export declare function createError(statusCode: number, code: string, message: string, details?: AppError["details"]): AppError;
export declare const ERROR_CODES: {
    readonly VALIDATION_ERROR: "VALIDATION_ERROR";
    readonly NOT_FOUND: "NOT_FOUND";
    readonly FILE_TOO_LARGE: "FILE_TOO_LARGE";
    readonly UNSUPPORTED_FORMAT: "UNSUPPORTED_FORMAT";
    readonly FILE_CORRUPTED: "FILE_CORRUPTED";
    readonly INTERNAL_ERROR: "INTERNAL_ERROR";
    readonly RATE_LIMITED: "RATE_LIMITED";
};
export declare function errorHandler(err: Error | AppError, req: Request, res: Response, _next: NextFunction): void;
