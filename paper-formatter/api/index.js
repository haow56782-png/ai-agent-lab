/**
 * Vercel Serverless entry point for Paper Formatter API.
 *
 * Exports the Express app as a Vercel serverless function.
 * Startup (DB init, storage init) is handled lazily on first request.
 */

import "dotenv/config";
import express from "express";
import { documentRoutes } from "./routes/documents.js";
import { profileRoutes } from "./routes/profiles.js";
import { jobRoutes } from "./routes/jobs.js";
import { findingRoutes } from "./routes/findings.js";
import { feedbackRoutes } from "./routes/feedback.js";
import { analyticsRoutes } from "./routes/analytics.js";
import { shareRoutes, sharePageRoutes } from "./routes/share.js";
import { errorHandler } from "./middleware/error-handler.js";
import { requestLogger } from "./middleware/request-logger.js";
import { runtimeConfig } from "./config.js";

const app = express();
const FIX_FREE_LIMIT = Math.max(0, parseInt(process.env.FIX_FREE_LIMIT || "3", 10) || 3);

app.disable("etag");

// ── CORS ──
app.use((_req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (_req.path === "/health" || _req.path === "/api/v1/health" || _req.path.startsWith("/api/v1/jobs")) {
    res.setHeader("Cache-Control", "no-store, max-age=0");
    res.setHeader("Pragma", "no-cache");
  }
  if (_req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.json());
app.use(requestLogger);

// ── Routes ──
app.use("/api/v1/documents", documentRoutes);
app.use("/api/v1/profiles", profileRoutes);
app.use("/api/v1/jobs", jobRoutes);
app.use("/api/v1/findings", findingRoutes);
app.use("/api/v1/feedbacks", feedbackRoutes);
app.use("/api/v1/analytics", analyticsRoutes);
app.use("/api/v1/share", shareRoutes);
app.use("/share", sharePageRoutes);

app.get("/api/v1/health", (_req, res) =>
  res.json({
    status: "ok",
    service: "paper-formatter-api",
    freeFixLimit: FIX_FREE_LIMIT,
    defaultExecutionModel: runtimeConfig.defaultExecutionModel,
    defaultModelProvider: runtimeConfig.defaultModelProvider,
    defaultExecutionPermissionMode: runtimeConfig.defaultExecutionPermissionMode,
  })
);
app.get("/health", (_req, res) =>
  res.json({
    status: "ok",
    service: "paper-formatter-api",
    freeFixLimit: FIX_FREE_LIMIT,
    defaultExecutionModel: runtimeConfig.defaultExecutionModel,
    defaultModelProvider: runtimeConfig.defaultModelProvider,
    defaultExecutionPermissionMode: runtimeConfig.defaultExecutionPermissionMode,
  })
);

app.use(errorHandler);

export default app;
