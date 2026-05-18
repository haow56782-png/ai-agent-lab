export const ERROR_CODES = {
    VALIDATION_ERROR: "VALIDATION_ERROR",
    TASK_NOT_FOUND: "TASK_NOT_FOUND",
    SIGNAL_NOT_FOUND: "SIGNAL_NOT_FOUND",
    REPORT_NOT_FOUND: "REPORT_NOT_FOUND",
    INTERNAL_ERROR: "INTERNAL_ERROR",
};
export class AppError extends Error {
    statusCode;
    code;
    constructor(statusCode, code, message) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.name = "AppError";
    }
}
export function errorHandler(err, req, res, _next) {
    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            error: {
                code: err.code,
                message: err.message,
                requestId: req.requestId,
            },
        });
        return;
    }
    res.status(500).json({
        error: {
            code: ERROR_CODES.INTERNAL_ERROR,
            message: "Internal server error",
            requestId: req.requestId,
        },
    });
}
//# sourceMappingURL=error-handler.js.map