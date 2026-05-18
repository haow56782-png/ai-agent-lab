/** ============================================================
 *  Memory Retrieval — Multi-strategy event retrieval.
 *
 *  Strategies:
 *    latest             — most recent N events
 *    similarity         — events matching criteria (by type, strategy)
 *    risk-priority      — highest-risk events first
 *    strategy-priority  — events for a specific strategy
 *    event-priority     — events of a specific type
 *  ============================================================ */
import type { MemoryEvent, RetrievalQuery } from "./types.js";
/**
 * Retrieve events matching the given query.
 */
export declare function retrieveEvents(events: MemoryEvent[], query: RetrievalQuery): MemoryEvent[];
//# sourceMappingURL=retrieval.d.ts.map