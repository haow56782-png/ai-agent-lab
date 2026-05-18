/**
 * VIB AI — Schema Migration Runner
 *
 * Applies numbered SQL migrations in order.
 * Tracks current version in the `_meta` table.
 * Each migration file must be named `{NNN}_{description}.sql`.
 */
import type { Database } from "./db.js";
export interface Migration {
    version: number;
    name: string;
    sql: string;
}
/** Load all migration files sorted by version number. */
export declare function loadMigrations(migrationsDir?: string): Migration[];
/** Get the current schema version from the database. */
export declare function getCurrentVersion(db: Database): Promise<number>;
/** Apply all pending migrations. */
export declare function runMigrations(db: Database, migrationsDir?: string): Promise<number>;
//# sourceMappingURL=migrations-runner.d.ts.map