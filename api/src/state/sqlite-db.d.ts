/**
 * VIB AI — SQLite Database Implementation
 *
 * Wraps better-sqlite3 behind the Database interface.
 * Uses WAL mode for better concurrent read performance.
 * Dynamically imports better-sqlite3 for ESM compatibility.
 */
import type { Database, RunResult, Row } from "./db.js";
import type BetterSqlite3 from "better-sqlite3";
export declare class SqliteDatabase implements Database {
    private db;
    private dbPath;
    constructor(dbPath: string);
    connect(): Promise<void>;
    close(): Promise<void>;
    exec(sql: string): Promise<void>;
    run(sql: string, params?: unknown[]): Promise<RunResult>;
    all<T = Row>(sql: string, params?: unknown[]): Promise<T[]>;
    get<T = Row>(sql: string, params?: unknown[]): Promise<T | undefined>;
    transaction<T>(fn: () => Promise<T>): Promise<T>;
    /** Access the underlying better-sqlite3 instance (for migration runner). */
    getRaw(): BetterSqlite3.Database;
    private ensureConnected;
}
//# sourceMappingURL=sqlite-db.d.ts.map