import { logger } from "../../logger.js";
export function requestLogger(req, res, next) {
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
//# sourceMappingURL=request-logger.js.map