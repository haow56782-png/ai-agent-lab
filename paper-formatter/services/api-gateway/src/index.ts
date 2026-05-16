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
import { ensureSchema, closePool } from "./db.js";
import { ensureBuckets } from "./storage.js";
import { ensureSeedSchools, migrateLegacyDetectedProfiles, normalizeCanonicalProfileSourceTypes } from "./repositories/profiles.js";
import { isRedisEnabled, redisDel } from "./redis.js";
import { runtimeConfig } from "./config.js";
import { CANONICAL_PROFILE_SEEDS } from "./fixtures/canonical-school-profiles.js";

const app = express();
const PORT = parseInt(process.env.PORT || "4000", 10);
const FIX_FREE_LIMIT = Math.max(0, parseInt(process.env.FIX_FREE_LIMIT || "3", 10) || 3);

app.disable("etag");

// ── CORS (allow browser testing from file:// or any origin) ──
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

// ── Global Middleware ──
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

// ── Error Handler ──
app.use(errorHandler);

// ── Start ──
async function start() {
  try {
    // Initialize Postgres schema
    await ensureSchema();
    console.log("[init] Database schema ready");

    // Seed canonical schools
    await ensureSeedSchools();
    const normalizedSourceTypes = await normalizeCanonicalProfileSourceTypes();
    console.log(`[init] Canonical profile source-type normalization: ${normalizedSourceTypes} profiles`);
    const migration = await migrateLegacyDetectedProfiles();
    console.log(`[init] Legacy detected profile migration: ${migration.migratedProfiles} profiles, ${migration.migratedDocumentLinks} document links`);
    if (isRedisEnabled() && (normalizedSourceTypes > 0 || migration.migratedProfiles > 0)) {
      await redisDel("profiles:list:all");
      await redisDel("profiles:list:v2:all");
      for (const seed of CANONICAL_PROFILE_SEEDS) {
        await redisDel(`profile:${seed.schoolId}`);
        await redisDel(`profile:v2:${seed.schoolId}`);
      }
      console.log("[init] Profile caches invalidated after source/profile normalization");
    }

    // Initialize MinIO buckets
    await ensureBuckets();
    console.log("[init] Storage buckets ready");
    console.log(`[init] Redis cache ${isRedisEnabled() ? "enabled" : "disabled"}`);
  } catch (err: any) {
    console.warn("[init] Infrastructure init warning:", err.message);
    console.warn("[init] Running in degraded mode — some features may be unavailable");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Paper Formatter API running at http://0.0.0.0:${PORT}`);
  });
}

start();

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n[shutdown] Shutting down...");
  await closePool();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n[shutdown] Shutting down...");
  await closePool();
  process.exit(0);
});

export default app;
