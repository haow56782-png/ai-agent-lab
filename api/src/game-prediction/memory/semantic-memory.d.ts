/** ============================================================
 *  Semantic Memory — Long-term knowledge extracted from the
 *  player's full event history and profile.
 *
 *  Computes risk score, tilt propensity, bankroll discipline,
 *  strategy affinity/reliability, and repeated tilt escalation.
 *  ============================================================ */
import type { MemoryEvent, PlayerProfile, SemanticMemory } from "./types.js";
/**
 * Build semantic memory from player profile and events.
 * This is the long-term knowledge passed to Decision/Debate engines.
 */
export declare function buildSemanticMemory(playerId: string, profile: PlayerProfile | null, events: MemoryEvent[]): SemanticMemory;
//# sourceMappingURL=semantic-memory.d.ts.map