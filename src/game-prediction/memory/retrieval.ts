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
export function retrieveEvents(
  events: MemoryEvent[],
  query: RetrievalQuery,
): MemoryEvent[] {
  const sorted = [...events].sort((a, b) =>
    b.timestamp.localeCompare(a.timestamp),
  );

  switch (query.strategy) {
    case "latest":
      return retrieveLatest(sorted, query.limit);
    case "similarity":
      return retrieveBySimilarity(sorted, query);
    case "risk-priority":
      return retrieveRiskPriority(sorted, query.limit);
    case "strategy-priority":
      return retrieveByStrategy(sorted, query.strategyName, query.limit);
    case "event-priority":
      return retrieveByEventType(sorted, query.eventType, query.limit);
    default:
      return sorted.slice(0, query.limit ?? 10);
  }
}

function retrieveLatest(sorted: MemoryEvent[], limit = 10): MemoryEvent[] {
  return sorted.slice(0, limit);
}

function retrieveBySimilarity(sorted: MemoryEvent[], query: RetrievalQuery): MemoryEvent[] {
  let filtered = sorted;

  // Filter by event type
  if (query.eventType) {
    filtered = filtered.filter((e) => e.type === query.eventType);
  }

  // Filter by strategy (check data.strategyName)
  if (query.strategyName) {
    filtered = filtered.filter((e) => e.data.strategyName === query.strategyName);
  }

  return filtered.slice(0, query.limit ?? 10);
}

function retrieveRiskPriority(sorted: MemoryEvent[], limit = 10): MemoryEvent[] {
  // Risk-priority: tilt_detected > stop_session > behavior_intervention > big_loss > others
  const priority: Record<string, number> = {
    tilt_detected: 5,
    stop_session: 4,
    behavior_intervention: 3,
    prediction_result: 1,
  };

  return [...sorted]
    .sort((a, b) => {
      const pa = priority[a.type] ?? 0;
      const pb = priority[b.type] ?? 0;
      if (pa !== pb) return pb - pa;
      return b.timestamp.localeCompare(a.timestamp);
    })
    .slice(0, limit);
}

function retrieveByStrategy(sorted: MemoryEvent[], strategyName?: string, limit = 10): MemoryEvent[] {
  if (!strategyName) return sorted.slice(0, limit);
  return sorted
    .filter((e) => e.data.strategyName === strategyName)
    .slice(0, limit);
}

function retrieveByEventType(sorted: MemoryEvent[], eventType?: string, limit = 10): MemoryEvent[] {
  if (!eventType) return sorted.slice(0, limit);
  return sorted
    .filter((e) => e.type === eventType)
    .slice(0, limit);
}
