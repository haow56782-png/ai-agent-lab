/**
 * VIB AI — SQLite Database Implementation
 *
 * Wraps better-sqlite3 behind the Database interface.
 * Uses WAL mode for better concurrent read performance.
 * Dynamically imports better-sqlite3 for ESM compatibility.
 */

import type { Database, RunResult, Row } from "./db.js";
import type BetterSqlite3 from "better-sqlite3";

export class SqliteDatabase implements Database {
  private db: BetterSqlite3.Database | null = null;
  private dbPath: string;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  async connect(): Promise<void> {
    const mod = await import("better-sqlite3");
    // better-sqlite3 ESM export is the default
    const BetterSqlite3 = mod.default || mod;
    this.db = new BetterSqlite3(this.dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
  }

  async close(): Promise<void> {
    this.db?.close();
    this.db = null;
  }

  async exec(sql: string): Promise<void> {
    this.ensureConnected();
    this.db!.exec(sql);
  }

  async run(sql: string, params?: unknown[]): Promise<RunResult> {
    this.ensureConnected();
    const stmt = this.db!.prepare(sql);
    const result = stmt.run(...(params ?? []));
    return {
      rowsAffected: result.changes,
      lastInsertRowid: Number(result.lastInsertRowid),
    };
  }

  async all<T = Row>(sql: string, params?: unknown[]): Promise<T[]> {
    this.ensureConnected();
    const stmt = this.db!.prepare(sql);
    return stmt.all(...(params ?? [])) as T[];
  }

  async get<T = Row>(sql: string, params?: unknown[]): Promise<T | undefined> {
    this.ensureConnected();
    const stmt = this.db!.prepare(sql);
    return stmt.get(...(params ?? [])) as T | undefined;
  }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    this.ensureConnected();
    this.db!.exec("BEGIN");
    try {
      const result = await fn();
      this.db!.exec("COMMIT");
      return result;
    } catch (err) {
      this.db!.exec("ROLLBACK");
      throw err;
    }
  }

  /** Access the underlying better-sqlite3 instance (for migration runner). */
  getRaw(): BetterSqlite3.Database {
    this.ensureConnected();
    return this.db!;
  }

  private ensureConnected(): void {
    if (!this.db) throw new Error("Database not connected. Call connect() first.");
  }
}
