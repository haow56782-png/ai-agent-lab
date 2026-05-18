/**
 * VIB AI — Database Interface
 *
 * Minimal abstraction over relational databases (SQLite today, Postgres tomorrow).
 * Business code NEVER uses this directly — use StateStore from types.ts.
 *
 * Implementations:
 *   - SqliteDatabase  (production)   → src/state/sqlite-db.ts
 *   - (future) PgDatabase            → src/state/pg-db.ts
 */
export interface RunResult {
    rowsAffected: number;
    lastInsertRowid?: number;
}
export type Row = Record<string, unknown>;
export interface Database {
    /** Open connection. Creates DB file if needed. */
    connect(): Promise<void>;
    /** Close connection. */
    close(): Promise<void>;
    /** Execute raw SQL (no params, typically for DDL). */
    exec(sql: string): Promise<void>;
    /** Execute a write statement with optional params. */
    run(sql: string, params?: unknown[]): Promise<RunResult>;
    /** Fetch all matching rows. */
    all<T = Row>(sql: string, params?: unknown[]): Promise<T[]>;
    /** Fetch first matching row, or undefined if none. */
    get<T = Row>(sql: string, params?: unknown[]): Promise<T | undefined>;
    /** Execute a callback within a BEGIN/COMMIT transaction. */
    transaction<T>(fn: () => Promise<T>): Promise<T>;
}
//# sourceMappingURL=db.d.ts.map