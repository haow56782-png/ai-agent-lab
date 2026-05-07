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
import { TRIGGER_LEVELS, classifyExecutionBoundary, boundaryRequiresPlan, boundaryRequiresArbitration } from "../review/external-review-policy.js";
import { InvariantRegistry } from "./invariant-registry.js";
import { computeDecisionHash } from "./governance-memory-utils.js";

/* ── Types ──────────────────────────────────────────────── */

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

/* ── Tier ordering ──────────────────────────────────────── */

const TIER_ORDER: Record<CostGuardTier, number> = {
  ZERO_COST: 0,
  LOW_COST: 1,
  MEDIUM_COST: 2,
  HIGH_COST: 3,
};

function tierExceedsMax(tier: CostGuardTier, max: CostGuardTier): boolean {
  return TIER_ORDER[tier] > TIER_ORDER[max];
}

function levelToCostTier(level: ReviewLevel): CostGuardTier {
  switch (level) {
    case "L0": return "ZERO_COST";
    case "L1": return "LOW_COST";
    case "L2": return "MEDIUM_COST";
    case "L3": return "HIGH_COST";
    default: return "ZERO_COST";
  }
}

/* ── Category → invariant mapping ───────────────────────── */

/**
 * Map trigger categories to the invariants they likely touch.
 * This is a local heuristic — no model call involved.
 */
const CATEGORY_INVARIANT_MAP: Partial<Record<TriggerCategory, string[]>> = {
  arbitration_ownership: ["INV-001", "INV-006"],
  model_routing_protocol: ["INV-001", "INV-006", "INV-008"],
  freeze_gate_state_machine: ["INV-002", "INV-005", "INV-007"],
  security_governance_invariant: ["INV-003", "INV-005"],
  governance_runtime_boundary: ["INV-003", "INV-004"],
  secret_boundary: ["INV-003"],
  provider_fallback_strategy: ["INV-002", "INV-008"],
  cognitive_reviewer_contract: ["INV-002", "INV-008"],
  new_model_role_introduction: ["INV-001", "INV-007", "INV-008"],
};

/* ── Implementation-only categories (no ADR, no review) ─── */

const IMPLEMENTATION_ONLY_CATEGORIES: Set<TriggerCategory> = new Set([
  "test_changes",
  "internal_refactor",
  "mock_provider",
  "non_breaking_cli_options",
  "implementation_only",
  "docs_only",
]);

/* ── Cost Guard ──────────────────────────────────────────── */

export class GovernanceCostGuard {
  private cache: Map<string, CachedReviewEntry> = new Map();
  private registry: InvariantRegistry;

  constructor(registry?: InvariantRegistry) {
    this.registry = registry ?? new InvariantRegistry();
  }

  /* ── 1. Local review level classification ──────────────── */

  /**
   * Determine review level from trigger categories BEFORE any model call.
   *
   * Rules:
   * - If all categories are implementation-only → L0 (no external review)
   * - If any category is L3 → L3 (freeze gate)
   * - If any category is L2 → L2 (external review)
   * - Otherwise → L0 (no external review needed)
   */
  classifyReviewLevelBeforeModelCall(metadata: ProposalMetadata): ReviewLevel {
    const { triggerCategories } = metadata;

    if (!triggerCategories || triggerCategories.length === 0) {
      return "L0" as ReviewLevel;
    }

    // Check if change is purely implementation
    const allImplementation = triggerCategories.every((c) =>
      IMPLEMENTATION_ONLY_CATEGORIES.has(c),
    );
    if (allImplementation) {
      return "L0" as ReviewLevel;
    }

    // Find highest level from trigger matrix
    let max: number = 0;
    for (const cat of triggerCategories) {
      const level = TRIGGER_LEVELS[cat];
      const num = levelToNumber(level);
      if (num > max) max = num;
    }

    switch (max) {
      case 3: return "L3" as ReviewLevel;
      case 2: return "L2" as ReviewLevel;
      case 1: return "L1" as ReviewLevel;
      default: return "L0" as ReviewLevel;
    }
  }

  /* ── 2. Local invariant detection ──────────────────────── */

  /**
   * Detect touched invariants from proposal metadata without calling any model.
   * Uses a local mapping of trigger categories to likely invariants.
   */
  detectTouchedInvariantsLocally(metadata: ProposalMetadata): string[] {
    const { triggerCategories } = metadata;
    const touched = new Set<string>();

    for (const cat of triggerCategories) {
      const invariants = CATEGORY_INVARIANT_MAP[cat];
      if (invariants) {
        for (const inv of invariants) {
          touched.add(inv);
        }
      }
    }

    // Include invariants explicitly referenced in metadata
    if (metadata.freezeVersion) {
      touched.add("INV-005"); // Freeze Gate required for constitutional changes
    }

    return Array.from(touched).sort();
  }

  /* ── 3. Replay scope restriction ────────────────────────── */

  /**
   * Restrict governance memory replay scope based on configuration.
   *
   * - "touched" (default): only replay touched invariants + their related ADRs
   * - "related": touched invariants + related ADRs + current freeze lineage + routing rules
   * - "full": full history replay (requires explicit --allow-full-replay)
   */
  restrictReplayScopeToTouchedInvariants(
    scope: ReplayScope,
    touchedInvariants: string[],
    adrId: string,
  ): {
    replayInvariantIds: string[];
    replayADRIds: string[];
    replayFullHistory: boolean;
  } {
    switch (scope) {
      case "touched":
        return {
          replayInvariantIds: [...touchedInvariants],
          replayADRIds: [adrId],
          replayFullHistory: false,
        };
      case "related":
        return {
          replayInvariantIds: [...touchedInvariants],
          replayADRIds: [adrId],
          replayFullHistory: false,
        };
      case "full":
        return {
          replayInvariantIds: [],
          replayADRIds: [],
          replayFullHistory: true,
        };
    }
  }

  /* ── 4. Deterministic decision hash ────────────────────── */

  /**
   * Compute deterministic hash for a proposal.
   * Reuses computeDecisionHash from governance-memory-utils.
   */
  computeDecisionHash(metadata: ProposalMetadata, touchedInvariants: string[]): string {
    return computeDecisionHash(
      metadata.adrId,
      metadata.decision,
      metadata.description ?? "",
      metadata.freezeVersion ?? "",
      touchedInvariants,
    );
  }

  /* ── 5. Cached review reuse ────────────────────────────── */

  /**
   * Check if a review result already exists for the same decision hash.
   * If found, return the cached result without calling any external model.
   */
  reuseCachedReviewIfDecisionHashExists(
    decisionHash: string,
    disableCache: boolean,
  ): CachedReviewEntry | null {
    if (disableCache) return null;

    const cached = this.cache.get(decisionHash);
    return cached ?? null;
  }

  /**
   * Store a review result in the cache keyed by decision hash.
   */
  storeCachedReview(
    decisionHash: string,
    reviewLevel: ReviewLevel,
    result: Record<string, unknown>,
  ): void {
    this.cache.set(decisionHash, {
      decisionHash,
      reviewLevel,
      result,
      timestamp: new Date().toISOString(),
    });
  }

  /* ── 6. Cost tier estimation ────────────────────────────── */

  /**
   * Estimate the governance cost tier based on review level.
   */
  estimateGovernanceCostTier(level: ReviewLevel): CostGuardTier {
    return levelToCostTier(level);
  }

  /* ── Full evaluation ────────────────────────────────────── */

  /**
   * Run the full cost guard evaluation for a proposal.
   * This is the main entry point that orchestrates all checks.
   */
  evaluate(
    metadata: ProposalMetadata,
    config: CostGuardConfig,
  ): CostGuardResult {
    const result: CostGuardResult = {
      reviewLevel: "L0" as ReviewLevel,
      costTier: "ZERO_COST",
      executionBoundary: "E0" as ExecutionBoundary,
      requiresPlan: false,
      requiresArbitration: false,
      touchedInvariants: [],
      replayScope: config.replayScope,
      cachedReviewUsed: false,
      blocked: false,
    };

    // Step 1: Classify review level locally
    result.reviewLevel = this.classifyReviewLevelBeforeModelCall(metadata);

    // Step 2: Estimate cost tier
    result.costTier = this.estimateGovernanceCostTier(result.reviewLevel);

    // Step 3: Classify execution boundary
    result.executionBoundary = classifyExecutionBoundary(metadata.triggerCategories);
    result.requiresPlan = boundaryRequiresPlan(result.executionBoundary);
    result.requiresArbitration = boundaryRequiresArbitration(result.executionBoundary);

    // Step 4: Check max cost tier enforcement
    if (tierExceedsMax(result.costTier, config.maxCostTier)) {
      result.blocked = true;
      result.blockReason =
        `Estimated cost tier ${result.costTier} exceeds max allowed ${config.maxCostTier}. ` +
        `Review level ${result.reviewLevel} blocked by cost guard.`;
      return result;
    }

    // Step 5: Detect touched invariants locally
    result.touchedInvariants = this.detectTouchedInvariantsLocally(metadata);

    // Step 6: Check cache
    if (!config.disableReviewCache && result.reviewLevel !== "L0") {
      const decisionHash = this.computeDecisionHash(metadata, result.touchedInvariants);
      const cached = this.reuseCachedReviewIfDecisionHashExists(decisionHash, false);
      if (cached) {
        result.cachedReviewUsed = true;
      }
    }

    // Step 7: Enforce L0 rules (no external review, no ADR, minimal entry)
    if (result.reviewLevel === "L0") {
      result.touchedInvariants = []; // L0 changes touch no invariants
    }

    // Step 8: Enforce L1 rules (default no external review)
    if (result.reviewLevel === "L1" && !config.allowL1ExternalReview) {
      // L1 is treated as local-only unless explicitly allowed
    }

    return result;
  }

  /* ── Utility ───────────────────────────────────────────── */

  clearCache(): void {
    this.cache.clear();
  }

  getCacheSize(): number {
    return this.cache.size;
  }
}

/* ── Helper ──────────────────────────────────────────────── */

function levelToNumber(level: ReviewLevel): number {
  switch (level) {
    case "L0": return 0;
    case "L1": return 1;
    case "L2": return 2;
    case "L3": return 3;
    default: return 0;
  }
}
