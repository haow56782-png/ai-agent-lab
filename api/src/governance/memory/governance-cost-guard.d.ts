/**
 * Governance Cost Guard — Cost-aware governance execution guard for P3.1.
 *
 * Prevents unnecessary external model calls by determining review level
 * locally before making any API calls. Enforces cost-tier limits, caches
 * review results by decision hash, and restricts replay scope to only
 * touched invariants.
 *
 * ============================================================
 *  P3.1 Cost-Aware Governance Execution
 * ============================================================ */
import type { ReviewLevel, TriggerCategory, ExecutionBoundary } from "../review/external-review-policy.js";
import { InvariantRegistry } from "./invariant-registry.js";
export type CostGuardTier = "ZERO_COST" | "LOW_COST" | "MEDIUM_COST" | "HIGH_COST";
export type ReplayScope = "touched" | "related" | "full";
export interface CostGuardConfig {
    enabled: boolean;
    maxCostTier: CostGuardTier;
    allowL1ExternalReview: boolean;
    disableReviewCache: boolean;
    replayScope: ReplayScope;
}
export interface ProposalMetadata {
    title: string;
    description?: string;
    triggerCategories: TriggerCategory[];
    changedFiles?: string[];
    adrId: string;
    decision: string;
    freezeVersion?: string;
}
export interface CachedReviewEntry {
    decisionHash: string;
    reviewLevel: ReviewLevel;
    result: Record<string, unknown>;
    timestamp: string;
}
export interface CostGuardResult {
    reviewLevel: ReviewLevel;
    costTier: CostGuardTier;
    executionBoundary: ExecutionBoundary;
    requiresPlan: boolean;
    requiresArbitration: boolean;
    touchedInvariants: string[];
    replayScope: ReplayScope;
    cachedReviewUsed: boolean;
    blocked: boolean;
    blockReason?: string;
}
export declare class GovernanceCostGuard {
    private cache;
    private registry;
    constructor(registry?: InvariantRegistry);
    /**
     * Determine review level from trigger categories BEFORE any model call.
     *
     * Rules:
     * - If all categories are implementation-only → L0 (no external review)
     * - If any category is L3 → L3 (freeze gate)
     * - If any category is L2 → L2 (external review)
     * - Otherwise → L0 (no external review needed)
     */
    classifyReviewLevelBeforeModelCall(metadata: ProposalMetadata): ReviewLevel;
    /**
     * Detect touched invariants from proposal metadata without calling any model.
     * Uses a local mapping of trigger categories to likely invariants.
     */
    detectTouchedInvariantsLocally(metadata: ProposalMetadata): string[];
    /**
     * Restrict governance memory replay scope based on configuration.
     *
     * - "touched" (default): only replay touched invariants + their related ADRs
     * - "related": touched invariants + related ADRs + current freeze lineage + routing rules
     * - "full": full history replay (requires explicit --allow-full-replay)
     */
    restrictReplayScopeToTouchedInvariants(scope: ReplayScope, touchedInvariants: string[], adrId: string): {
        replayInvariantIds: string[];
        replayADRIds: string[];
        replayFullHistory: boolean;
    };
    /**
     * Compute deterministic hash for a proposal.
     * Reuses computeDecisionHash from governance-memory-utils.
     */
    computeDecisionHash(metadata: ProposalMetadata, touchedInvariants: string[]): string;
    /**
     * Check if a review result already exists for the same decision hash.
     * If found, return the cached result without calling any external model.
     */
    reuseCachedReviewIfDecisionHashExists(decisionHash: string, disableCache: boolean): CachedReviewEntry | null;
    /**
     * Store a review result in the cache keyed by decision hash.
     */
    storeCachedReview(decisionHash: string, reviewLevel: ReviewLevel, result: Record<string, unknown>): void;
    /**
     * Estimate the governance cost tier based on review level.
     */
    estimateGovernanceCostTier(level: ReviewLevel): CostGuardTier;
    /**
     * Run the full cost guard evaluation for a proposal.
     * This is the main entry point that orchestrates all checks.
     */
    evaluate(metadata: ProposalMetadata, config: CostGuardConfig): CostGuardResult;
    clearCache(): void;
    getCacheSize(): number;
}
//# sourceMappingURL=governance-cost-guard.d.ts.map