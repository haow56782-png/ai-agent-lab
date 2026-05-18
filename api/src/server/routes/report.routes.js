import { Router } from "express";
import { getReportHandler } from "../controllers/report.controller.js";
export function createReportRoutes(reportStore) {
    const router = Router();
    router.get("/:reportId", getReportHandler(reportStore));
    return router;
}
//# sourceMappingURL=report.routes.js.map