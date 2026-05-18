import { getReport } from "../services/report.service.js";
import { AppError, ERROR_CODES } from "../middleware/error-handler.js";
export function getReportHandler(reportStore) {
    return async (req, res, next) => {
        try {
            const report = await getReport(req.params.reportId, reportStore);
            if (!report) {
                throw new AppError(404, ERROR_CODES.REPORT_NOT_FOUND, `Report ${req.params.reportId} not found`);
            }
            res.json({
                reportId: report.reportId,
                taskId: report.taskId,
                summary: report.summary,
                findings: report.findings,
                createdAt: report.createdAt,
            });
        }
        catch (err) {
            next(err);
        }
    };
}
//# sourceMappingURL=report.controller.js.map