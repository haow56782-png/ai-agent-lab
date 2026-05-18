import type { Request, Response, NextFunction } from "express";
export interface ApiError {
    error: {
        code: string;
        message: string;
        requestId: string;
    };
}
export declare const ERROR_CODES: {
    readonly VALIDATION_ERROR: "VALIDATION_ERROR";
    readonly TASK_NOT_FOUND: "TASK_NOT_FOUND";
    readonly SIGNAL_NOT_FOUND: "SIGNAL_NOT_FOUND";
    readonly REPORT_NOT_FOUND: "REPORT_NOT_FOUND";
    readonly INTERNAL_ERROR: "INTERNAL_ERROR";
};
export declare class AppError extends Error {
    statusCode: number;
    code: string;
    constructor(statusCode: number, code: string, message: string);
}
export declare function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void;
//# sourceMappingURL=error-handler.d.ts.map