import { Router } from "express";
import { getReportHandler } from "../controllers/report.controller.js";
import type { ReportStore } from "../stores/types.js";

export function createReportRoutes(reportStore: ReportStore): Router {
  const router = Router();
  router.get("/:reportId", getReportHandler(reportStore));
  return router;
}
