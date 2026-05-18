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
import type { StateStore } from "./types.js";
export type { StateStore, SessionRecord, WorkflowRunRecord, TaskRunRecord, EvalHistoryRecord, TraceSpanRecord, MetricsSnapshotRecord, } from "./types.js";
export { MemoryStateStore } from "./memory-store.js";
export interface CreateStateStoreOptions {
    /** SQLite database path. Use ":memory:" for temp databases. */
    dbPath?: string;
}
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
export declare function createStateStore(options?: CreateStateStoreOptions): StateStore;
//# sourceMappingURL=index.d.ts.map