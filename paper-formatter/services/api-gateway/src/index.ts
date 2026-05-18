/**
 * Paper Formatter API — Docker / long-running entry point.
 */
import { createApp } from "./app.js";
import { ensureSchema, closePool } from "./db.js";
import { ensureBuckets } from "./storage.js";
import { ensureSeedSchools, migrateLegacyDetectedProfiles, normalizeCanonicalProfileSourceTypes } from "./repositories/profiles.js";
import { isRedisEnabled, redisDel } from "./redis.js";
import { CANONICAL_PROFILE_SEEDS } from "./fixtures/canonical-school-profiles.js";

const { app, FIX_FREE_LIMIT } = createApp();
const PORT = parseInt(process.env.PORT || "4000", 10);

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
