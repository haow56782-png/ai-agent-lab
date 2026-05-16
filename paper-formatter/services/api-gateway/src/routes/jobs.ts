import { Router } from "express";
import {
  getPublicDiff,
  getPublicFixStatus,
  getPublicJob,
  writeJobDownload,
} from "../services/job-queries.js";
import {
  startAnalyzeJob,
  startFixJob,
  startFormatJob,
} from "../services/job-orchestrator.js";
import {
  parseAnalyzeJobCommand,
  parseFixJobCommand,
  parseFormatJobCommand,
} from "../dto/job-document-requests.js";

export const jobRoutes = Router();

jobRoutes.use((_req, res, next) => {
  if (typeof res.setHeader === "function") {
    res.setHeader("Cache-Control", "no-store, max-age=0");
    res.setHeader("Pragma", "no-cache");
  }
  next();
});

// HTTP edge only: validate request shape, delegate orchestration to services,
// and keep response contracts stable for the client.
jobRoutes.post("/analyze", async (req, res, next) => {
  try {
    const command = parseAnalyzeJobCommand(req.body);
    const result = await startAnalyzeJob({
      legacyDocId: command.legacyDocId,
      profileId: command.profileId,
    });
    res.status(202).json(result);
  } catch (err) {
    next(err);
  }
});

jobRoutes.post("/format", async (req, res, next) => {
  try {
    const command = parseFormatJobCommand(req.body);
    const result = await startFormatJob({
      legacyDocId: command.legacyDocId,
      jobId: command.jobId,
      profileId: command.profileId,
    });
    res.status(202).json(result);
  } catch (err) {
    next(err);
  }
});

jobRoutes.post("/fix", async (req, res, next) => {
  try {
    const command = parseFixJobCommand(req.body);
    const result = await startFixJob({
      jobId: command.jobId,
      legacyDocId: command.legacyDocId,
      profileId: command.profileId,
      fixTypes: command.fixTypes,
      selectedFixes: command.selectedFixes,
    });
    res.status(202).json(result);
  } catch (err) {
    next(err);
  }
});

jobRoutes.get("/:jobId", async (req, res, next) => {
  try {
    const result = await getPublicJob(req.params.jobId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

jobRoutes.get("/:jobId/fix-status", async (req, res, next) => {
  try {
    const result = await getPublicFixStatus(req.params.jobId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

jobRoutes.get("/:jobId/diff", async (req, res, next) => {
  try {
    const result = await getPublicDiff(req.params.jobId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

jobRoutes.get("/:jobId/download", async (req, res, next) => {
  try {
    await writeJobDownload(req.params.jobId, req.query.type as string | undefined, res);
  } catch (err) {
    next(err);
  }
});
