/**
 * VIB AI — State Layer Public API
 *
 * Entry point for all persistence operations.
 * Business code imports from here — never from repositories/ or db.ts.
 *
 * Usage:
 *   import { createStateStore, type StateStore } from "./state/index.js";
 *   const store = createStateStore({ dbPath: ":memory:" });
 *   await store.init();
 *   await store.saveSession({ id: "s1", startedAt: new Date().toISOString() });
 *   const session = await store.loadSession("s1");
 *   await store.close();
 */

import { SqliteDatabase } from "./sqlite-db.js";
import { SqliteStateStore } from "./repositories/index.js";
import type { StateStore } from "./types.js";

// Re-export types
export type {
  StateStore,
  SessionRecord,
  WorkflowRunRecord,
  TaskRunRecord,
  EvalHistoryRecord,
  TraceSpanRecord,
  MetricsSnapshotRecord,
} from "./types.js";

export { MemoryStateStore } from "./memory-store.js";

export interface CreateStateStoreOptions {
  /** SQLite database path. Use ":memory:" for temp databases. */
  dbPath?: string;
}

const DEFAULT_DB_PATH = "vib-agent-state.db";

/**
 * Create a SQLite-backed StateStore.
 *
 * @example
 * ```ts
 * const store = createStateStore({ dbPath: ":memory:" });
 * await store.init();
 * // ... use store ...
 * await store.close();
 * ```
 */
export function createStateStore(
  options: CreateStateStoreOptions = {},
): StateStore {
  const dbPath = options.dbPath ?? DEFAULT_DB_PATH;
  const db = new SqliteDatabase(dbPath);
  return new SqliteStateStore(db);
}
