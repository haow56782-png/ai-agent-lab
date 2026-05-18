/**
 * Report Service — creates and retrieves analysis reports.
 *
 * Billing note (charging point 3):
 * Report generation charging trigger is TBD. Two options:
 *   A) Charge at task COMPLETED (state machine lock, alongside signal).
 *   B) Charge on a dedicated report endpoint (idempotency-key required).
 * Currently does NOT charge. See task.service.ts for full billing architecture.
 */
import type { ReportStore, ReportRecord, TaskStore } from "../stores/types.js";
export declare function createReportForTask(taskId: string, taskStore: TaskStore, reportStore: ReportStore): Promise<ReportRecord | undefined>;
export declare function getReport(reportId: string, reportStore: ReportStore): Promise<ReportRecord | undefined>;
//# sourceMappingURL=report.service.d.ts.map