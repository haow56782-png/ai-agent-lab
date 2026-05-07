/**
 * DeepSeek Execution Boundary Tests — Semantic-Risk-Based Model Execution Policy
 *
 * Core principle:
 *   DeepSeek execution is bounded by semantic risk, not by file count.
 *   If a change alters "how the system makes decisions in the future,"
 *   even a one-line change escalates to E3.
 *
 * Tests:
 * 1. E0-E3 classification by trigger category
 * 2. boundaryRequiresPlan / boundaryRequiresArbitration
 * 3. many-file implementation-only change remains E1
 * 4. one-line arbitration ownership change escalates to E3
 * 5. one-line secret boundary violation escalates to E3
 * 6. review-runner flow change escalates to E2
 * 7. L2/L3 trigger matrix change escalates to E3
 * 8. CostGuardResult includes execution boundary fields
 * 9. getRecommendedExecutor returns correct model
 * 10. describeExecutionBoundary returns non-empty descriptions
 */

import { describe, it, expect } from "vitest";
import {
  classifyExecutionBoundary,
  boundaryRequiresPlan,
  boundaryRequiresArbitration,
  getRecommendedExecutor,
  describeExecutionBoundary,
  ExecutionBoundary,
  ReviewLevel,
} from "../../src/governance/review/external-review-policy.js";
import { GovernanceCostGuard } from "../../src/governance/memory/governance-cost-guard.js";
import type { CostGuardConfig, ProposalMetadata } from "../../src/governance/memory/governance-cost-guard.js";
import type { TriggerCategory } from "../../src/governance/review/external-review-policy.js";

/* ── Helpers ────────────────────────────────────────────── */

const defaultConfig: CostGuardConfig = {
  enabled: true,
  maxCostTier: "HIGH_COST",
  allowL1ExternalReview: false,
  disableReviewCache: false,
  replayScope: "touched",
};

function makeMetadata(categories: TriggerCategory[]): ProposalMetadata {
  return {
    title: "Boundary Test",
    description: "Testing execution boundary classification",
    triggerCategories: categories,
    adrId: "ADR-BOUNDARY-TEST",
    decision: "Test decision",
  };
}

/* ── Tests ──────────────────────────────────────────────── */

describe("DeepSeek Execution Boundary — E0/E1/E2/E3 classification", () => {
  it("classifies test_changes as E0", () => {
    expect(classifyExecutionBoundary(["test_changes"])).toBe(ExecutionBoundary.E0);
  });

  it("classifies implementation_only as E0", () => {
    expect(classifyExecutionBoundary(["implementation_only"])).toBe(ExecutionBoundary.E0);
  });

  it("classifies docs_only as E0", () => {
    expect(classifyExecutionBoundary(["docs_only"])).toBe(ExecutionBoundary.E0);
  });

  it("classifies mock_provider as E1", () => {
    expect(classifyExecutionBoundary(["mock_provider"])).toBe(ExecutionBoundary.E1);
  });

  it("classifies non_breaking_cli_options as E1", () => {
    expect(classifyExecutionBoundary(["non_breaking_cli_options"])).toBe(ExecutionBoundary.E1);
  });

  it("classifies internal_refactor as E1", () => {
    expect(classifyExecutionBoundary(["internal_refactor"])).toBe(ExecutionBoundary.E1);
  });

  it("classifies provider_fallback_strategy as E2", () => {
    expect(classifyExecutionBoundary(["provider_fallback_strategy"])).toBe(ExecutionBoundary.E2);
  });

  it("classifies cognitive_reviewer_contract as E2", () => {
    expect(classifyExecutionBoundary(["cognitive_reviewer_contract"])).toBe(ExecutionBoundary.E2);
  });

  it("classifies model_routing_protocol as E3", () => {
    expect(classifyExecutionBoundary(["model_routing_protocol"])).toBe(ExecutionBoundary.E3);
  });

  it("classifies freeze_gate_state_machine as E3", () => {
    expect(classifyExecutionBoundary(["freeze_gate_state_machine"])).toBe(ExecutionBoundary.E3);
  });

  it("classifies arbitration_ownership as E3", () => {
    expect(classifyExecutionBoundary(["arbitration_ownership"])).toBe(ExecutionBoundary.E3);
  });

  it("classifies secret_boundary as E3", () => {
    expect(classifyExecutionBoundary(["secret_boundary"])).toBe(ExecutionBoundary.E3);
  });

  it("classifies empty categories as E0", () => {
    expect(classifyExecutionBoundary([])).toBe(ExecutionBoundary.E0);
  });

  it("mixed categories use highest boundary", () => {
    expect(classifyExecutionBoundary(["test_changes", "arbitration_ownership"])).toBe(ExecutionBoundary.E3);
    expect(classifyExecutionBoundary(["test_changes", "provider_fallback_strategy"])).toBe(ExecutionBoundary.E2);
    expect(classifyExecutionBoundary(["docs_only", "mock_provider"])).toBe(ExecutionBoundary.E1);
  });
});

describe("DeepSeek Execution Boundary — requiresPlan / requiresArbitration", () => {
  it("E0 does not require plan", () => {
    expect(boundaryRequiresPlan(ExecutionBoundary.E0)).toBe(false);
  });

  it("E1 does not require plan", () => {
    expect(boundaryRequiresPlan(ExecutionBoundary.E1)).toBe(false);
  });

  it("E2 requires plan", () => {
    expect(boundaryRequiresPlan(ExecutionBoundary.E2)).toBe(true);
  });

  it("E3 requires plan", () => {
    expect(boundaryRequiresPlan(ExecutionBoundary.E3)).toBe(true);
  });

  it("E0-E2 do not require arbitration", () => {
    expect(boundaryRequiresArbitration(ExecutionBoundary.E0)).toBe(false);
    expect(boundaryRequiresArbitration(ExecutionBoundary.E1)).toBe(false);
    expect(boundaryRequiresArbitration(ExecutionBoundary.E2)).toBe(false);
  });

  it("E3 requires arbitration", () => {
    expect(boundaryRequiresArbitration(ExecutionBoundary.E3)).toBe(true);
  });
});

describe("DeepSeek Execution Boundary — getRecommendedExecutor", () => {
  it("E0 recommends deepseek", () => {
    expect(getRecommendedExecutor(ExecutionBoundary.E0)).toBe("deepseek");
  });

  it("E1 recommends deepseek", () => {
    expect(getRecommendedExecutor(ExecutionBoundary.E1)).toBe("deepseek");
  });

  it("E2 recommends claude-opus", () => {
    expect(getRecommendedExecutor(ExecutionBoundary.E2)).toBe("claude-opus");
  });

  it("E3 recommends claude-opus", () => {
    expect(getRecommendedExecutor(ExecutionBoundary.E3)).toBe("claude-opus");
  });
});

describe("DeepSeek Execution Boundary — describeExecutionBoundary", () => {
  it("E0 returns non-empty description", () => {
    const desc = describeExecutionBoundary(ExecutionBoundary.E0);
    expect(desc.length).toBeGreaterThan(0);
    expect(desc).toContain("E0");
    expect(desc).toContain("Free Execution");
  });

  it("E1 returns non-empty description", () => {
    const desc = describeExecutionBoundary(ExecutionBoundary.E1);
    expect(desc.length).toBeGreaterThan(0);
    expect(desc).toContain("E1");
  });

  it("E2 returns non-empty description", () => {
    const desc = describeExecutionBoundary(ExecutionBoundary.E2);
    expect(desc.length).toBeGreaterThan(0);
    expect(desc).toContain("E2");
    expect(desc).toContain("Opus Plan Required");
  });

  it("E3 returns non-empty description", () => {
    const desc = describeExecutionBoundary(ExecutionBoundary.E3);
    expect(desc.length).toBeGreaterThan(0);
    expect(desc).toContain("E3");
    expect(desc).toContain("External Review");
  });
});

describe("DeepSeek Execution Boundary — semantic risk > file count", () => {
  it("many-file implementation_only change remains E0/E1", () => {
    // 100 files of implementation only = still E0
    const categories: TriggerCategory[] = [];
    for (let i = 0; i < 100; i++) categories.push("implementation_only");
    expect(classifyExecutionBoundary(categories)).toBe(ExecutionBoundary.E0);
  });

  it("many-file test_changes change remains E0", () => {
    const categories: TriggerCategory[] = [];
    for (let i = 0; i < 50; i++) categories.push("test_changes");
    expect(classifyExecutionBoundary(categories)).toBe(ExecutionBoundary.E0);
  });

  it("one-line arbitration_ownership change escalates to E3", () => {
    // Single category, single "file" — but semantically critical
    expect(classifyExecutionBoundary(["arbitration_ownership"])).toBe(ExecutionBoundary.E3);
  });

  it("one-line secret_boundary change escalates to E3", () => {
    expect(classifyExecutionBoundary(["secret_boundary"])).toBe(ExecutionBoundary.E3);
  });

  it("one-line model_routing_protocol change escalates to E3", () => {
    expect(classifyExecutionBoundary(["model_routing_protocol"])).toBe(ExecutionBoundary.E3);
  });

  it("one-line freeze_gate_state_machine change escalates to E3", () => {
    expect(classifyExecutionBoundary(["freeze_gate_state_machine"])).toBe(ExecutionBoundary.E3);
  });

  it("one-line governance_runtime_boundary change escalates to E3", () => {
    expect(classifyExecutionBoundary(["governance_runtime_boundary"])).toBe(ExecutionBoundary.E3);
  });

  it("one-line security_governance_invariant change escalates to E3", () => {
    expect(classifyExecutionBoundary(["security_governance_invariant"])).toBe(ExecutionBoundary.E3);
  });

  it("one-line provider_fallback_strategy (E2) does NOT escalate to E3", () => {
    expect(classifyExecutionBoundary(["provider_fallback_strategy"])).toBe(ExecutionBoundary.E2);
  });
});

describe("DeepSeek Execution Boundary — CostGuardResult integration", () => {
  it("CostGuardResult includes executionBoundary field", () => {
    const guard = new GovernanceCostGuard();
    const meta = makeMetadata(["test_changes"]);
    const result = guard.evaluate(meta, defaultConfig);
    expect(result).toHaveProperty("executionBoundary");
    expect(result).toHaveProperty("requiresPlan");
    expect(result).toHaveProperty("requiresArbitration");
  });

  it("L0 change via cost guard has E0 boundary", () => {
    const guard = new GovernanceCostGuard();
    const meta = makeMetadata(["test_changes"]);
    const result = guard.evaluate(meta, defaultConfig);
    expect(result.reviewLevel).toBe("L0");
    expect(result.executionBoundary).toBe("E0");
    expect(result.requiresPlan).toBe(false);
    expect(result.requiresArbitration).toBe(false);
  });

  it("L3 change via cost guard has E3 boundary", () => {
    const guard = new GovernanceCostGuard();
    const meta = makeMetadata(["arbitration_ownership"]);
    const result = guard.evaluate(meta, defaultConfig);
    expect(result.reviewLevel).toBe("L3");
    expect(result.executionBoundary).toBe("E3");
    expect(result.requiresPlan).toBe(true);
    expect(result.requiresArbitration).toBe(true);
  });

  it("L2 change has E2 boundary", () => {
    const guard = new GovernanceCostGuard();
    const meta = makeMetadata(["provider_fallback_strategy"]);
    const result = guard.evaluate(meta, defaultConfig);
    expect(result.reviewLevel).toBe("L2");
    expect(result.executionBoundary).toBe("E2");
    expect(result.requiresPlan).toBe(true);
    expect(result.requiresArbitration).toBe(false);
  });

  it("E3 boundary with insufficient cost tier is still blocked", () => {
    const guard = new GovernanceCostGuard();
    const meta = makeMetadata(["arbitration_ownership"]);
    const config: CostGuardConfig = { ...defaultConfig, maxCostTier: "MEDIUM_COST" };
    const result = guard.evaluate(meta, config);
    expect(result.blocked).toBe(true);
    expect(result.executionBoundary).toBe("E3"); // Boundary classified even when blocked
  });

  it("L2/L3 trigger matrix categories classified correctly", () => {
    // All E3 categories correspond to L3 trigger categories
    const e3Categories: TriggerCategory[] = [
      "model_routing_protocol",
      "freeze_gate_state_machine",
      "arbitration_ownership",
      "security_governance_invariant",
      "governance_runtime_boundary",
      "secret_boundary",
    ];
    const guard = new GovernanceCostGuard();
    for (const cat of e3Categories) {
      const meta = makeMetadata([cat]);
      const result = guard.evaluate(meta, defaultConfig);
      expect(result.executionBoundary, `${cat} should be E3`).toBe("E3");
      expect(result.reviewLevel, `${cat} should be L3`).toBe("L3");
    }
  });
});
