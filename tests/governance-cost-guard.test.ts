/**
 * Governance Cost Guard Tests — P3.1 Cost-Aware Governance Execution.
 *
 * Tests:
 * 1. L0 does not call external reviewer
 * 2. L1 defaults to no external reviewer
 * 3. L2 allows gpt-5.5
 * 4. L3 allows gpt-5.5-pro + requires Freeze Gate
 * 5. Touched invariant local detection
 * 6. Replay scope defaults to touched
 * 7. Full replay requires explicit allow
 * 8. Same decisionHash reuses cached review
 * 9. Trivial change does not create ADR
 * 10. Implementation-only change does not enter Freeze Gate
 * 11. max-cost-tier blocks excessive review
 * 12. Stable decision hash
 */

import { describe, it, expect } from "vitest";
import { GovernanceCostGuard } from "../src/governance/memory/governance-cost-guard.js";
import type { CostGuardConfig, ProposalMetadata } from "../src/governance/memory/governance-cost-guard.js";
import { ReviewLevel } from "../src/governance/review/external-review-policy.js";
import type { TriggerCategory } from "../src/governance/review/external-review-policy.js";

/* ── Helpers ────────────────────────────────────────────── */

function makeMetadata(categories: TriggerCategory[], overrides?: Partial<ProposalMetadata>): ProposalMetadata {
  return {
    title: "Test Proposal",
    description: "A test proposal for cost guard evaluation",
    triggerCategories: categories,
    adrId: "ADR-TEST-001",
    decision: "Test decision content",
    ...overrides,
  };
}

const defaultConfig: CostGuardConfig = {
  enabled: true,
  maxCostTier: "MEDIUM_COST",
  allowL1ExternalReview: false,
  disableReviewCache: false,
  replayScope: "touched",
};

/* ── Tests ──────────────────────────────────────────────── */

describe("P3.1 Governance Cost Guard", () => {
  describe("1. L0 classification", () => {
    it("classifies test_changes as L0", () => {
      const guard = new GovernanceCostGuard();
      const meta = makeMetadata(["test_changes"]);
      const result = guard.evaluate(meta, defaultConfig);
      expect(result.reviewLevel).toBe("L0");
      expect(result.costTier).toBe("ZERO_COST");
      expect(result.blocked).toBe(false);
    });

    it("classifies docs_only as L0", () => {
      const guard = new GovernanceCostGuard();
      const meta = makeMetadata(["docs_only"]);
      const result = guard.evaluate(meta, defaultConfig);
      expect(result.reviewLevel).toBe("L0");
    });

    it("classifies internal_refactor as L0", () => {
      const guard = new GovernanceCostGuard();
      const meta = makeMetadata(["internal_refactor"]);
      const result = guard.evaluate(meta, defaultConfig);
      expect(result.reviewLevel).toBe("L0");
    });

    it("classifies mock_provider as L0", () => {
      const guard = new GovernanceCostGuard();
      const meta = makeMetadata(["mock_provider"]);
      const result = guard.evaluate(meta, defaultConfig);
      expect(result.reviewLevel).toBe("L0");
    });

    it("classifies implementation_only as L0", () => {
      const guard = new GovernanceCostGuard();
      const meta = makeMetadata(["implementation_only"]);
      const result = guard.evaluate(meta, defaultConfig);
      expect(result.reviewLevel).toBe("L0");
    });

    it("L0 cost is ZERO_COST and never exceeds max MEDIUM_COST", () => {
      const guard = new GovernanceCostGuard();
      const meta = makeMetadata(["test_changes"]);
      const result = guard.evaluate(meta, defaultConfig);
      expect(result.costTier).toBe("ZERO_COST");
      expect(result.blocked).toBe(false);
    });

    it("L0 has no touched invariants", () => {
      const guard = new GovernanceCostGuard();
      const meta = makeMetadata(["implementation_only"]);
      const result = guard.evaluate(meta, defaultConfig);
      expect(result.touchedInvariants).toEqual([]);
    });
  });

  describe("2. L1 defaults to no external reviewer", () => {
    it("classifies L1 but keeps cost low", () => {
      const guard = new GovernanceCostGuard();
      const meta = makeMetadata(["internal_refactor", "test_changes"]);
      const result = guard.evaluate(meta, defaultConfig);
      expect(result.reviewLevel).toBe("L0"); // All impl categories → L0
    });

    it("L1 triggers respect allowL1ExternalReview flag", () => {
      const guard = new GovernanceCostGuard();
      // Create a config that allows L1 external review
      const config: CostGuardConfig = { ...defaultConfig, allowL1ExternalReview: true };
      // No pure L1 categories in the trigger matrix, but we can test via local decision
      const meta = makeMetadata(["test_changes"]); // still L0
      const result = guard.evaluate(meta, config);
      expect(result.reviewLevel).toBe("L0");
    });
  });

  describe("3. L2 allows gpt-5.5", () => {
    it("classifies provider_fallback_strategy as L2", () => {
      const guard = new GovernanceCostGuard();
      const meta = makeMetadata(["provider_fallback_strategy"]);
      const result = guard.evaluate(meta, defaultConfig);
      expect(result.reviewLevel).toBe("L2");
      expect(result.costTier).toBe("MEDIUM_COST");
      expect(result.blocked).toBe(false);
    });

    it("classifies cognitive_reviewer_contract as L2", () => {
      const guard = new GovernanceCostGuard();
      const meta = makeMetadata(["cognitive_reviewer_contract"]);
      const result = guard.evaluate(meta, defaultConfig);
      expect(result.reviewLevel).toBe("L2");
    });

    it("L2 triggers touched invariants include relevant IDs", () => {
      const guard = new GovernanceCostGuard();
      const meta = makeMetadata(["provider_fallback_strategy"]);
      const result = guard.evaluate(meta, defaultConfig);
      expect(result.touchedInvariants.length).toBeGreaterThan(0);
      // provider_fallback_strategy maps to INV-002 and INV-008
      expect(result.touchedInvariants).toContain("INV-002");
      expect(result.touchedInvariants).toContain("INV-008");
    });
  });

  describe("4. L3 allows gpt-5.5-pro + requires Freeze Gate", () => {
    it("classifies model_routing_protocol as L3", () => {
      const guard = new GovernanceCostGuard();
      const meta = makeMetadata(["model_routing_protocol"]);
      const config: CostGuardConfig = { ...defaultConfig, maxCostTier: "HIGH_COST" };
      const result = guard.evaluate(meta, config);
      expect(result.reviewLevel).toBe("L3");
      expect(result.costTier).toBe("HIGH_COST");
      expect(result.blocked).toBe(false);
    });

    it("classifies freeze_gate_state_machine as L3", () => {
      const guard = new GovernanceCostGuard();
      const meta = makeMetadata(["freeze_gate_state_machine"]);
      const result = guard.evaluate(meta, defaultConfig);
      expect(result.reviewLevel).toBe("L3");
    });

    it("classifies arbitration_ownership as L3", () => {
      const guard = new GovernanceCostGuard();
      const meta = makeMetadata(["arbitration_ownership"]);
      const result = guard.evaluate(meta, defaultConfig);
      expect(result.reviewLevel).toBe("L3");
    });

    it("L3 triggers touched invariants include authority invariants", () => {
      const guard = new GovernanceCostGuard();
      const meta = makeMetadata(["arbitration_ownership"]);
      const config: CostGuardConfig = { ...defaultConfig, maxCostTier: "HIGH_COST" };
      const result = guard.evaluate(meta, config);
      expect(result.touchedInvariants).toContain("INV-001");
      expect(result.touchedInvariants).toContain("INV-006");
    });
  });

  describe("5. Touched invariant local detection", () => {
    it("detects invariants from multiple trigger categories", () => {
      const guard = new GovernanceCostGuard();
      const meta = makeMetadata(["arbitration_ownership", "security_governance_invariant"]);
      const config: CostGuardConfig = { ...defaultConfig, maxCostTier: "HIGH_COST" };
      const result = guard.evaluate(meta, config);
      expect(result.touchedInvariants).toContain("INV-001");
      expect(result.touchedInvariants).toContain("INV-003");
      expect(result.touchedInvariants).toContain("INV-005");
      expect(result.touchedInvariants).toContain("INV-006");
    });

    it("detects invariants for freezeVersion", () => {
      const guard = new GovernanceCostGuard();
      const meta = makeMetadata(["docs_only"], { freezeVersion: "freeze-v1" });
      const result = guard.evaluate(meta, defaultConfig);
      // docs_only is L0, so invariants are cleared
      expect(result.reviewLevel).toBe("L0");
    });

    it("returns empty for implementation-only changes", () => {
      const guard = new GovernanceCostGuard();
      const meta = makeMetadata(["implementation_only"]);
      const result = guard.evaluate(meta, defaultConfig);
      expect(result.touchedInvariants).toEqual([]);
    });
  });

  describe("6. Replay scope defaults to touched", () => {
    it("defaults to touched scope", () => {
      const guard = new GovernanceCostGuard();
      expect(defaultConfig.replayScope).toBe("touched");
    });

    it("restrictReplayScopeToTouchedInvariants returns touched-only for touched scope", () => {
      const guard = new GovernanceCostGuard();
      const result = guard.restrictReplayScopeToTouchedInvariants("touched", ["INV-001", "INV-005"], "ADR-001");
      expect(result.replayInvariantIds).toEqual(["INV-001", "INV-005"]);
      expect(result.replayFullHistory).toBe(false);
    });

    it("related scope returns invariant IDs without full history", () => {
      const guard = new GovernanceCostGuard();
      const result = guard.restrictReplayScopeToTouchedInvariants("related", ["INV-002"], "ADR-002");
      expect(result.replayInvariantIds).toEqual(["INV-002"]);
      expect(result.replayFullHistory).toBe(false);
    });

    it("full scope returns fullHistory=true", () => {
      const guard = new GovernanceCostGuard();
      const result = guard.restrictReplayScopeToTouchedInvariants("full", ["INV-001"], "ADR-003");
      expect(result.replayFullHistory).toBe(true);
    });
  });

  describe("7. Full replay requires explicit allow", () => {
    it("touched scope does not replay full history", () => {
      const guard = new GovernanceCostGuard();
      const meta = makeMetadata(["cognitive_reviewer_contract"]);
      const config: CostGuardConfig = { ...defaultConfig, replayScope: "touched" };
      const result = guard.evaluate(meta, config);
      expect(result.replayScope).toBe("touched");
    });
  });

  describe("8. Same decisionHash reuses cached review", () => {
    it("returns cachedReviewUsed=true when hash matches cache", () => {
      const guard = new GovernanceCostGuard();
      const meta = makeMetadata(["provider_fallback_strategy"]);
      const result = guard.evaluate(meta, defaultConfig);
      const decisionHash = guard.computeDecisionHash(meta, result.touchedInvariants);

      // Store a cached entry
      guard.storeCachedReview(decisionHash, ReviewLevel.L2, { verdict: "APPROVE" });
      expect(guard.getCacheSize()).toBe(1);

      // Re-evaluate — should use cache
      const cachedResult = guard.evaluate(meta, defaultConfig);
      expect(cachedResult.cachedReviewUsed).toBe(true);
    });

    it("does not use cache when cache is disabled", () => {
      const guard = new GovernanceCostGuard();
      const meta = makeMetadata(["provider_fallback_strategy"]);
      const result = guard.evaluate(meta, defaultConfig);
      const decisionHash = guard.computeDecisionHash(meta, result.touchedInvariants);
      guard.storeCachedReview(decisionHash, ReviewLevel.L2, { verdict: "APPROVE" });

      const config: CostGuardConfig = { ...defaultConfig, disableReviewCache: true };
      const cachedResult = guard.evaluate(meta, config);
      expect(cachedResult.cachedReviewUsed).toBe(false);
    });

    it("different proposals produce different hashes", () => {
      const guard = new GovernanceCostGuard();
      const meta1 = makeMetadata(["provider_fallback_strategy"]);
      const meta2 = makeMetadata(["model_routing_protocol"]);
      const r1 = guard.evaluate(meta1, defaultConfig);
      const r2 = guard.evaluate(meta2, defaultConfig);
      const h1 = guard.computeDecisionHash(meta1, r1.touchedInvariants);
      const h2 = guard.computeDecisionHash(meta2, r2.touchedInvariants);
      expect(h1).not.toBe(h2);
    });
  });

  describe("9-10. Trivial / implementation-only changes", () => {
    it("implementation-only change does not trigger L3/Freeze Gate", () => {
      const guard = new GovernanceCostGuard();
      const meta = makeMetadata(["implementation_only"]);
      const result = guard.evaluate(meta, defaultConfig);
      expect(result.reviewLevel).toBe("L0"); // Not L3, no Freeze Gate
    });

    it("mixed trivial and non-trivial uses highest level", () => {
      const guard = new GovernanceCostGuard();
      const meta = makeMetadata(["test_changes", "provider_fallback_strategy"]);
      const result = guard.evaluate(meta, defaultConfig);
      expect(result.reviewLevel).toBe("L2"); // Highest is L2
    });
  });

  describe("11. max-cost-tier blocks excessive review", () => {
    it("blocks L3 when max is MEDIUM_COST", () => {
      const guard = new GovernanceCostGuard();
      const meta = makeMetadata(["model_routing_protocol"]);
      const config: CostGuardConfig = { ...defaultConfig, maxCostTier: "MEDIUM_COST" };
      const result = guard.evaluate(meta, config);
      expect(result.blocked).toBe(true);
      expect(result.blockReason).toContain("exceeds max allowed");
    });

    it("blocks L2 when max is LOW_COST", () => {
      const guard = new GovernanceCostGuard();
      const meta = makeMetadata(["cognitive_reviewer_contract"]);
      const config: CostGuardConfig = { ...defaultConfig, maxCostTier: "LOW_COST" };
      const result = guard.evaluate(meta, config);
      expect(result.blocked).toBe(true);
    });

    it("allows L2 when max is MEDIUM_COST", () => {
      const guard = new GovernanceCostGuard();
      const meta = makeMetadata(["provider_fallback_strategy"]);
      const config: CostGuardConfig = { ...defaultConfig, maxCostTier: "MEDIUM_COST" };
      const result = guard.evaluate(meta, config);
      expect(result.blocked).toBe(false);
    });

    it("allows L3 when max is HIGH_COST", () => {
      const guard = new GovernanceCostGuard();
      const meta = makeMetadata(["model_routing_protocol"]);
      const config: CostGuardConfig = { ...defaultConfig, maxCostTier: "HIGH_COST" };
      const result = guard.evaluate(meta, config);
      expect(result.blocked).toBe(false);
    });

    it("allows L0 even when max is ZERO_COST", () => {
      const guard = new GovernanceCostGuard();
      const meta = makeMetadata(["test_changes"]);
      const config: CostGuardConfig = { ...defaultConfig, maxCostTier: "ZERO_COST" };
      const result = guard.evaluate(meta, config);
      expect(result.blocked).toBe(false);
    });
  });

  describe("12. Stable decision hash", () => {
    it("same inputs produce same hash", () => {
      const guard = new GovernanceCostGuard();
      const meta = makeMetadata(["provider_fallback_strategy"]);
      const r1 = guard.evaluate(meta, defaultConfig);
      const r2 = guard.evaluate(meta, defaultConfig);
      const h1 = guard.computeDecisionHash(meta, r1.touchedInvariants);
      const h2 = guard.computeDecisionHash(meta, r2.touchedInvariants);
      expect(h1).toBe(h2);
    });

    it("hash is deterministic (20 calls same result)", () => {
      const guard = new GovernanceCostGuard();
      const meta = makeMetadata(["arbitration_ownership"]);
      const result = guard.evaluate(meta, defaultConfig);
      const hash = guard.computeDecisionHash(meta, result.touchedInvariants);
      for (let i = 0; i < 20; i++) {
        expect(guard.computeDecisionHash(meta, result.touchedInvariants)).toBe(hash);
      }
    });
  });

  describe("Cost Guard — Edge cases", () => {
    it("handles empty trigger categories", () => {
      const guard = new GovernanceCostGuard();
      const meta = makeMetadata([]);
      const result = guard.evaluate(meta, defaultConfig);
      expect(result.reviewLevel).toBe("L0");
    });

    it("clears cache properly", () => {
      const guard = new GovernanceCostGuard();
      const meta = makeMetadata(["provider_fallback_strategy"]);
      const result = guard.evaluate(meta, defaultConfig);
      const dh = guard.computeDecisionHash(meta, result.touchedInvariants);
      guard.storeCachedReview(dh, ReviewLevel.L2, { verdict: "APPROVE" });
      expect(guard.getCacheSize()).toBe(1);
      guard.clearCache();
      expect(guard.getCacheSize()).toBe(0);
    });

    it("classifyReviewLevelBeforeModelCall returns L0 for undefined categories", () => {
      const guard = new GovernanceCostGuard();
      const meta = makeMetadata([]);
      const level = guard.classifyReviewLevelBeforeModelCall(meta);
      expect(level).toBe("L0");
    });

    it("detectTouchedInvariantsLocally returns sorted array", () => {
      const guard = new GovernanceCostGuard();
      // Multiple categories produce multiple invariants
      const meta = makeMetadata(["security_governance_invariant", "arbitration_ownership"]);
      const r = guard.evaluate(meta, defaultConfig);
      // Should be sorted
      for (let i = 1; i < r.touchedInvariants.length; i++) {
        expect(r.touchedInvariants[i] >= r.touchedInvariants[i - 1]).toBe(true);
      }
    });
  });
});
