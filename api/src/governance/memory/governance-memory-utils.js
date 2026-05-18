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
export function computeDecisionHash(adrId, decision, context, freezeVersion, invariantsTouched) {
    const invariants = Array.isArray(invariantsTouched)
        ? invariantsTouched.slice().sort().join(",")
        : invariantsTouched;
    const input = `${adrId}|${decision}|${context}|${freezeVersion}|${invariants}`;
    return fnv1aHash(input);
}
/**
 * FNV-1a hash (32-bit) produces a deterministic hex string from any input.
 */
function fnv1aHash(input) {
    let hash = 0x811c9dc5; // FNV offset basis
    for (let i = 0; i < input.length; i++) {
        hash ^= input.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193); // FNV prime
    }
    // Ensure unsigned 32-bit, then format as 8-char hex
    return (hash >>> 0).toString(16).padStart(8, "0");
}
//# sourceMappingURL=governance-memory-utils.js.map