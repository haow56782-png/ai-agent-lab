/**
 * Paper Formatter API — Docker / long-running entry point.
 */
import { createApp } from "./app.js";
import { ensureSchema, closePool } from "./db.js";
import { ensureBuckets } from "./storage.js";
import { ensureSeedSchools, migrateLegacyDetectedProfiles, normalizeCanonicalProfileSourceTypes } from "./repositories/profiles.js";
import { initCacheStore, getCache } from "./cache/index.js";
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
    console.log("[init] Seeding canonical schools...");
    await ensureSeedSchools();
    console.log("[init] Canonical schools seeded");
    const normalizedSourceTypes = await normalizeCanonicalProfileSourceTypes();
    console.log(`[init] Canonical profile source-type normalization: ${normalizedSourceTypes} profiles`);
    const migration = await migrateLegacyDetectedProfiles();
    console.log(`[init] Legacy detected profile migration: ${migration.migratedProfiles} profiles, ${migration.migratedDocumentLinks} document links`);
    // Initialize cache store (Redis if available, otherwise in-memory)
    const { mode } = await initCacheStore();

    // Invalidate stale profile caches after normalization/migration
    if (normalizedSourceTypes > 0 || migration.migratedProfiles > 0) {
      const cache = getCache();
      await cache.del("profiles:list:all");
      await cache.del("profiles:list:v2:all");
      for (const seed of CANONICAL_PROFILE_SEEDS) {
        await cache.del(`profile:${seed.schoolId}`);
        await cache.del(`profile:v2:${seed.schoolId}`);
      }
      console.log("[init] Profile caches invalidated after source/profile normalization");
    }

    // Initialize MinIO buckets
    await ensureBuckets();
    console.log("[init] Storage buckets ready");
    console.log(`[init] Cache mode: ${mode}`);
  } catch (err: any) {
    console.error("[init] Infrastructure init error:", err.message);
    console.error("[init] Stack:", err.stack);
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
