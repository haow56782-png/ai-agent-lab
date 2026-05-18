/** ============================================================
 *  Session Memory — Current session state derived from
 *  MemoryEvents belonging to the active sessionId.
 *  ============================================================ */
import type { MemoryEvent, SessionMemory } from "./types.js";
/**
 * Build current session memory from events for a given sessionId.
 */
export declare function buildSessionMemory(sessionId: string, playerId: string, events: MemoryEvent[], currentBankroll: number, startingBankroll: number): SessionMemory;
//# sourceMappingURL=session-memory.d.ts.map