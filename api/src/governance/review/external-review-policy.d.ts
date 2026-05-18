/** ============================================================
 *  External Review Policy — Governance trigger evaluation
 *
 *  Determines whether a change requires external cognitive
 *  review (L2) or freeze gate escalation (L3) based on the
 *  categories of affected architecture boundaries.
 *
 *  The policy prevents architecture decision drift across
 *  evolving cognitive systems by governing decision authority,
 *  protocol stability, and constitutional boundaries.
 *  ============================================================ */
import type { RoutingDecisionLog } from "./review-types.js";
export declare enum ReviewLevel {
    L0 = "L0",
    L1 = "L1",
    L2 = "L2",
    L3 = "L3"
}
/**
 * DeepSeek Execution Boundary — bounds model execution by semantic risk,
 * not by file count or line count.
 *
 * E0 — Free Execution (DeepSeek, no plan)
 * E1 — Batch Execution With Tests (DeepSeek, no plan)
 * E2 — Opus Plan Required Before Execution
 * E3 — Opus Arbitration + External Review + Freeze Gate
 *
 * Core principle:
 *   DeepSeek execution is bounded by semantic risk, not by file count.
 *   If a change alters "how the system makes decisions in the future,"
 *   even a one-line change escalates to E3.
 */
export declare enum ExecutionBoundary {
    E0 = "E0",
    E1 = "E1",
    E2 = "E2",
    E3 = "E3"
}
/**
 * Map each trigger category to its execution boundary level.
 * This determines which model may execute the change.
 */
declare const SEMANTIC_BOUNDARY_MAP: Record<TriggerCategory, ExecutionBoundary>;
export type TriggerCategory = "model_routing_protocol" | "freeze_gate_state_machine" | "arbitration_ownership" | "security_governance_invariant" | "governance_runtime_boundary" | "secret_boundary" | "provider_fallback_strategy" | "cognitive_reviewer_contract" | "routing_decision_log_schema" | "architecture_diff_check_rules" | "new_model_role_introduction" | "drift_detection_logic" | "test_changes" | "internal_refactor" | "mock_provider" | "non_breaking_cli_options" | "implementation_only" | "docs_only";
declare const TRIGGER_LEVELS: Record<TriggerCategory, ReviewLevel>;
declare const TRIGGER_DESCRIPTIONS: Record<TriggerCategory, string>;
export interface ReviewerModelRequirement {
    level: ReviewLevel;
    model: string;
    allowedAsFinalReviewer: boolean;
    purpose: string;
}
declare const REVIEWER_MODEL_POLICY: Record<ReviewLevel, ReviewerModelRequirement>;
export interface TriggerEvaluation {
    category: TriggerCategory;
    level: ReviewLevel;
    reason: string;
    requiresExternalReview: boolean;
    requiresFreezeGate: boolean;
}
/**
 * Classify a single trigger category into its review level.
 */
export declare function evaluateTrigger(category: TriggerCategory): TriggerEvaluation;
/**
 * Given a list of affected categories, return the highest
 * required review level.
 */
export declare function getReviewLevel(categories: TriggerCategory[]): ReviewLevel;
export declare function shouldRequireExternalReview(level: ReviewLevel): boolean;
export declare function shouldEscalateToFreezeGate(level: ReviewLevel): boolean;
export declare function getRequiredReviewerModel(level: ReviewLevel): ReviewerModelRequirement;
/**
 * Classify the execution boundary for a set of trigger categories.
 * Returns the highest (most restrictive) boundary across all categories.
 */
export declare function classifyExecutionBoundary(categories: TriggerCategory[]): ExecutionBoundary;
/**
 * Whether this boundary requires an Opus-authored plan before execution.
 * E0 and E1 can be executed directly by DeepSeek; E2 and E3 require Opus.
 */
export declare function boundaryRequiresPlan(boundary: ExecutionBoundary): boolean;
/**
 * Whether this boundary requires Opus Arbitration + External Review + Freeze Gate.
 * Only E3 requires full escalation.
 */
export declare function boundaryRequiresArbitration(boundary: ExecutionBoundary): boolean;
/**
 * Get the recommended executor model for a given execution boundary.
 */
export declare function getRecommendedExecutor(boundary: ExecutionBoundary): string;
/**
 * Human-readable description of each execution boundary.
 */
export declare function describeExecutionBoundary(boundary: ExecutionBoundary): string;
/**
 * Evaluate a routing log entry against the policy to detect
 * semantic or authority drift.
 */
export declare function evaluateRoutingDrift(entry: RoutingDecisionLog): {
    driftDetected: boolean;
    warnings: string[];
};
export { TRIGGER_LEVELS, TRIGGER_DESCRIPTIONS, REVIEWER_MODEL_POLICY, SEMANTIC_BOUNDARY_MAP };
//# sourceMappingURL=external-review-policy.d.ts.map