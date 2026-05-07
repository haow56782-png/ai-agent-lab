import type { Request, Response, NextFunction } from "express";
import { getReport } from "../services/report.service.js";
import { AppError, ERROR_CODES } from "../middleware/error-handler.js";
import type { ReportStore } from "../stores/types.js";

export function getReportHandler(reportStore: ReportStore) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const report = await getReport(req.params.reportId as string, reportStore);
      if (!report) {
        throw new AppError(404, ERROR_CODES.REPORT_NOT_FOUND, `Report ${req.params.reportId as string} not found`);
      }

      res.json({
        reportId: report.reportId,
        taskId: report.taskId,
        summary: report.summary,
        findings: report.findings,
        createdAt: report.createdAt,
      });
    } catch (err) {
      next(err);
    }
  };
}
