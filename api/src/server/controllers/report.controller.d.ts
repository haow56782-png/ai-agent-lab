import type { Request, Response, NextFunction } from "express";
import type { ReportStore } from "../stores/types.js";
export declare function getReportHandler(reportStore: ReportStore): (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=report.controller.d.ts.map