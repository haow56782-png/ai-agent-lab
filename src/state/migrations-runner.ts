/**
 * VIB AI — Schema Migration Runner
 *
 * Applies numbered SQL migrations in order.
 * Tracks current version in the `_meta` table.
 * Each migration file must be named `{NNN}_{description}.sql`.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Database } from "./db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, "migrations");

export interface Migration {
  version: number;
  name: string;
  sql: string;
}

/** Load all migration files sorted by version number. */
export function loadMigrations(migrationsDir?: string): Migration[] {
  const dir = migrationsDir ?? MIGRATIONS_DIR;
  let files: string[];
  try {
    files = readdirSync(dir).filter((f) => f.match(/^\d{3}_.+\.sql$/));
  } catch {
    return [];
  }
  files.sort();

  return files.map((file) => {
    const match = file.match(/^(\d{3})_(.+)\.sql$/);
    return {
      version: parseInt(match![1]!, 10),
      name: match![2]!,
      sql: readFileSync(join(dir, file), "utf-8"),
    };
  });
}

/** Get the current schema version from the database. */
export async function getCurrentVersion(db: Database): Promise<number> {
  try {
    // Ensure _meta table exists (for first-run safety)
    await db.exec(
      "CREATE TABLE IF NOT EXISTS _meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);",
    );
    await db.exec(
      "INSERT OR IGNORE INTO _meta (key, value) VALUES ('schema_version', '0');",
    );
    const row = await db.get<{ value: string }>(
      "SELECT value FROM _meta WHERE key = 'schema_version'",
    );
    return parseInt(row?.value ?? "0", 10);
  } catch {
    return 0;
  }
}

/** Apply all pending migrations. */
export async function runMigrations(
  db: Database,
  migrationsDir?: string,
): Promise<number> {
  const migrations = loadMigrations(migrationsDir);
  if (migrations.length === 0) return 0;

  const currentVersion = await getCurrentVersion(db);
  const pending = migrations.filter((m) => m.version > currentVersion);

  if (pending.length === 0) return 0;

  for (const migration of pending) {
    await db.transaction(async () => {
      // Strip SQL comment lines before parsing statements.
      // This prevents "-- comment\nCREATE TABLE" chunks from being
      // dropped because the trimmed text starts with "--".
      const noComments = migration.sql.replace(/^\s*--.*$/gm, "");
      const statements = noComments
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const stmt of statements) {
        await db.exec(stmt + ";");
      }

      await db.run("UPDATE _meta SET value = ? WHERE key = 'schema_version'", [
        String(migration.version),
      ]);
    });
  }

  return pending.length;
}
