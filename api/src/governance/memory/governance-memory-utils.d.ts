/**
 * Governance Memory Utils — Shared helpers for governance memory.
 *
 * Provides deterministic decision hash computation and other
 * utility functions used across the governance memory modules.
 *
 * ============================================================
 *  P3.0 Architecture Memory & Governance Persistence
 * ============================================================ */
/**
 * Compute a deterministic hash for a governance decision.
 * Hash is derived from: adrId + decision + context + freezeVersion + invariantsTouched
 *
 * The invariantsTouched array is sorted before hashing to ensure
 * deterministic output regardless of input order.
 *
 * Uses simple string hashing (FNV-1a variant) to avoid external
 * dependency on crypto libraries.
 */
export declare function computeDecisionHash(adrId: string, decision: string, context: string, freezeVersion: string, invariantsTouched: string[] | string): string;
//# sourceMappingURL=governance-memory-utils.d.ts.map