/** ============================================================
 *  Player Profile — Builds and updates PlayerProfile from
 *  stored MemoryEvents.  Generates long-term risk scores,
 *  bankroll discipline, strategy affinity, and confidence
 *  trends.  Cross-session persistence keyed by playerId.
 *  ============================================================ */
import type { MemoryEvent, PlayerProfile } from "./types.js";
/**
 * Build a fresh PlayerProfile from scratch using stored events.
 * Deterministic: same events → same profile.
 */
export declare function buildProfile(playerId: string, events: MemoryEvent[], existingProfile?: PlayerProfile | null): PlayerProfile;
/**
 * Get or create a profile, merging with stored events.
 */
export declare function getOrCreateProfile(playerId: string, events: MemoryEvent[], existingProfile: PlayerProfile | null): Promise<PlayerProfile>;
//# sourceMappingURL=player-profile.d.ts.map