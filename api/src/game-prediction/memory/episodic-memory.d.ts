/** ============================================================
 *  Episodic Memory — Notable past events extracted from the
 *  full event log.  Filters for significant losses, wins,
 *  tilt detections, interventions, and STOP_SESSION events.
 *  ============================================================ */
import type { MemoryEvent, EpisodicMemory } from "./types.js";
/**
 * Build episodic memory from stored events.
 * Extracts significant events and categorizes them.
 */
export declare function buildEpisodicMemory(playerId: string, events: MemoryEvent[]): EpisodicMemory;
//# sourceMappingURL=episodic-memory.d.ts.map