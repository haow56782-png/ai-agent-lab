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

import { buildSessionMemory } from "./session-memory.js";
import { buildEpisodicMemory } from "./episodic-memory.js";
import { buildSemanticMemory } from "./semantic-memory.js";
import { getOrCreateProfile } from "./player-profile.js";
import { generateMemorySummary, generateConstraints, generatePersistentWarnings } from "./summarizer.js";
import type { MemoryContext, MemoryEvent, MemoryIdentity, MemoryStore, PlayerProfile } from "./types.js";

export { InMemoryMemoryStore, FileMemoryStore } from "./store.js";
export { retrieveEvents } from "./retrieval.js";
export type {
  MemoryContext, MemoryEvent, MemoryIdentity, MemoryStore, PlayerProfile,
  SessionMemory, EpisodicMemory, SemanticMemory, RetrievalQuery, RetrievalStrategy,
} from "./types.js";

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
export async function buildMemoryContext(
  store: MemoryStore,
  identity: MemoryIdentity,
  currentBankroll: number,
  startingBankroll: number,
): Promise<MemoryContext> {
  // 1. Replay all events for this player
  const { events, profile: existingProfile } = await store.replay(identity.playerId);

  // 2. Build/update profile
  const profile: PlayerProfile = await getOrCreateProfile(identity.playerId, events, existingProfile);

  // 3. Build session memory
  const session = buildSessionMemory(identity.sessionId, identity.playerId, events, currentBankroll, startingBankroll);

  // 4. Build episodic memory
  const episodic = buildEpisodicMemory(identity.playerId, events);

  // 5. Build semantic memory
  const semantic = buildSemanticMemory(identity.playerId, profile, events);

  // 6. Generate constraints and persistent warnings
  const recommendedConstraints = generateConstraints(session, semantic, profile);
  const persistentWarnings = generatePersistentWarnings(profile, semantic);

  // 7. Generate summary
  const ctx: MemoryContext = {
    identity,
    playerProfile: profile,
    session,
    episodic,
    semantic,
    summary: "",
    recommendedConstraints,
    persistentWarnings,
  };
  ctx.summary = generateMemorySummary(ctx);

  // Persist updated profile
  await store.saveProfile(profile);

  return ctx;
}

/**
 * Append a new MemoryEvent to the store and return updated context.
 * This is the primary way to record new information.
 */
export async function recordAndRebuild(
  store: MemoryStore,
  identity: MemoryIdentity,
  event: MemoryEvent,
  currentBankroll: number,
  startingBankroll: number,
): Promise<MemoryContext> {
  await store.appendEvent(event);
  return buildMemoryContext(store, identity, currentBankroll, startingBankroll);
}
