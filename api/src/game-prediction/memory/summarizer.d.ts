/** ============================================================
 *  Session Summarizer — Generates human-readable summaries
 *  from MemoryContext for the Decision / Debate engines.
 *  ============================================================ */
import type { MemoryContext, PlayerProfile, SessionMemory, SemanticMemory } from "./types.js";
/**
 * Generate a full summary string from MemoryContext.
 */
export declare function generateMemorySummary(context: MemoryContext): string;
/**
 * Generate recommended constraints from semantic memory.
 */
export declare function generateConstraints(session: SessionMemory, semantic: SemanticMemory, profile: PlayerProfile | null): string[];
/**
 * Generate persistent warnings from semantic memory.
 */
export declare function generatePersistentWarnings(profile: PlayerProfile | null, semantic: SemanticMemory): string[];
//# sourceMappingURL=summarizer.d.ts.map