import { getSignal } from "../services/signal.service.js";
import { AppError, ERROR_CODES } from "../middleware/error-handler.js";
export function getSignalHandler(signalStore) {
    return async (req, res, next) => {
        try {
            const signal = await getSignal(req.params.signalId, signalStore);
            if (!signal) {
                throw new AppError(404, ERROR_CODES.SIGNAL_NOT_FOUND, `Signal ${req.params.signalId} not found`);
            }
            res.json({
                signalId: signal.signalId,
                taskId: signal.taskId,
                status: signal.status,
                summary: signal.summary,
                confidence: signal.confidence,
                createdAt: signal.createdAt,
            });
        }
        catch (err) {
            next(err);
        }
    };
}
//# sourceMappingURL=signal.controller.js.map