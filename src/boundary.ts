/** ============================================================
 *  Execution Boundary Runtime Integration
 *
 *  Integrates E0–E3 boundary classification into the agent
 *  runtime. Classifies user requests at agent.run() entry,
 *  selects the appropriate model, and enforces the execution
 *  gate for E2/E3 when Opus is not available.
 *  ============================================================ */

import {
  classifyExecutionBoundary,
  getRecommendedExecutor,
  boundaryRequiresPlan,
  boundaryRequiresArbitration,
  describeExecutionBoundary,
  ExecutionBoundary,
  type TriggerCategory,
} from "./governance/review/external-review-policy.js";

export interface BoundaryDecision {
  boundary: ExecutionBoundary;
  recommendedExecutor: string;
  requiresPlan: boolean;
  requiresArbitration: boolean;
  modelName: string;
  description: string;
}

/**
 * Classification patterns: maps keyword groups to trigger categories.
 * Ordered from highest risk (E3) to lowest (E0).
 */
const E3_PATTERNS: { keywords: string[]; category: TriggerCategory }[] = [
  { keywords: ["model routing", "execution boundary", "model route"], category: "model_routing_protocol" },
  { keywords: ["freeze gate", "freeze"], category: "freeze_gate_state_machine" },
  { keywords: ["arbitration ownership", "arbitration authority"], category: "arbitration_ownership" },
  { keywords: ["security invariant", "governance invariant", "constitutional invariant"], category: "security_governance_invariant" },
  { keywords: ["governance runtime", "runtime boundary"], category: "governance_runtime_boundary" },
  { keywords: ["secret", "api key", "secret management"], category: "secret_boundary" },
];

const E2_PATTERNS: { keywords: string[]; category: TriggerCategory }[] = [
  { keywords: ["provider fallback", "fallback strategy"], category: "provider_fallback_strategy" },
  { keywords: ["cognitive review", "reviewer contract", "cognitive reviewer"], category: "cognitive_reviewer_contract" },
  { keywords: ["routing decision log", "routing log schema"], category: "routing_decision_log_schema" },
  { keywords: ["architecture diff", "diff check", "diff-check"], category: "architecture_diff_check_rules" },
  { keywords: ["new model role", "model role intro"], category: "new_model_role_introduction" },
  { keywords: ["drift detection", "architecture drift"], category: "drift_detection_logic" },
  { keywords: ["review policy", "review runner", "external review"], category: "cognitive_reviewer_contract" },
];

/**
 * Classify a user request into an execution boundary decision.
 *
 * Uses keyword heuristics to map the input to trigger categories,
 * then delegates to classifyExecutionBoundary() for the final
 * boundary level. Unknown requests default to E0 (implementation).
 */
export function classifyTask(input: string): BoundaryDecision {
  const lower = input.toLowerCase();
  const categories: TriggerCategory[] = [];

  // Check E3 patterns (highest risk — checked first)
  for (const pattern of E3_PATTERNS) {
    if (pattern.keywords.some((kw) => lower.includes(kw))) {
      categories.push(pattern.category);
    }
  }

  // Check E2 patterns
  for (const pattern of E2_PATTERNS) {
    if (pattern.keywords.some((kw) => lower.includes(kw))) {
      categories.push(pattern.category);
    }
  }

  // Default to implementation_only (E0)
  if (categories.length === 0) {
    categories.push("implementation_only");
  }

  const boundary = classifyExecutionBoundary(categories);
  const executor = getRecommendedExecutor(boundary);

  return {
    boundary,
    recommendedExecutor: executor,
    requiresPlan: boundaryRequiresPlan(boundary),
    requiresArbitration: boundaryRequiresArbitration(boundary),
    modelName: selectModel(boundary),
    description: describeExecutionBoundary(boundary),
  };
}

/**
 * Select model name based on execution boundary.
 *
 * E0/E1 → DeepSeek (default model, no override needed)
 * E2/E3 → Opus (requires opusModel to be configured)
 *
 * Returns the model name string. The caller decides what to do
 * if opusModel is not set for E2/E3 (use DeepSeek or block).
 */
export function selectModel(
  boundary: ExecutionBoundary,
  opusModel?: string,
): string {
  switch (boundary) {
    case ExecutionBoundary.E0:
    case ExecutionBoundary.E1:
      return "deepseek";
    case ExecutionBoundary.E2:
    case ExecutionBoundary.E3:
      return opusModel || "deepseek";
  }
}

/**
 * Whether the agent should gate execution for this boundary
 * when Opus is not available.
 */
export function boundaryRequiresOpus(boundary: ExecutionBoundary): boolean {
  return boundary === "E2" || boundary === "E3";
}

export const BOUNDARY_ENFORCEMENT_MESSAGE =
  "This task requires Opus-level execution (E2/E3 boundary) but no Opus model is configured. "
  + "Set LLM_OPUS_MODEL or opusModel in config to enable execution. "
  + "Alternatively, reduce the task scope to E0/E1.";
