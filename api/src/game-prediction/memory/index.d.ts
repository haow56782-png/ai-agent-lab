/** ============================================================
 *  Memory & Session Intelligence — Entry point
 *
 *  buildMemoryContext() reconstructs a full MemoryContext from
 *  stored events, rebuilding session, episodic, and semantic
 *  memory layers.  Keyed by playerId, not sessionId.
 *
 *  Decision Engine / Debate Engine can read:
 *    - persistentWarnings
 *    - semantic.riskScore / riskEscalationLevel
 *    - semantic.strategyReliability
 *    - semantic.repeatedTiltEscalation
 *  ============================================================ */
import type { MemoryContext, MemoryEvent, MemoryIdentity, MemoryStore } from "./types.js";
export { InMemoryMemoryStore, FileMemoryStore } from "./store.js";
export { retrieveEvents } from "./retrieval.js";
export type { MemoryContext, MemoryEvent, MemoryIdentity, MemoryStore, PlayerProfile, SessionMemory, EpisodicMemory, SemanticMemory, RetrievalQuery, RetrievalStrategy, } from "./types.js";
/**
 * Build a complete MemoryContext for a player.
 *
 * 1. Load events from store (deterministic replay)
 * 2. Build/update player profile
 * 3. Build session memory from current session events
 * 4. Build episodic memory from all events
 * 5. Build semantic memory from profile + events
 * 6. Generate summary, constraints, persistent warnings
 *
 * @param store   MemoryStore (in-memory or persistent)
 * @param identity  Player identity (playerId is primary key)
 * @param currentBankroll  Current bankroll for session state
 * @param startingBankroll  Starting bankroll for session state
 */
export declare function buildMemoryContext(store: MemoryStore, identity: MemoryIdentity, currentBankroll: number, startingBankroll: number): Promise<MemoryContext>;
/**
 * Append a new MemoryEvent to the store and return updated context.
 * This is the primary way to record new information.
 */
export declare function recordAndRebuild(store: MemoryStore, identity: MemoryIdentity, event: MemoryEvent, currentBankroll: number, startingBankroll: number): Promise<MemoryContext>;
//# sourceMappingURL=index.d.ts.map