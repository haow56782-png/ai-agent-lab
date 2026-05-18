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
/* ── Review Levels ─────────────────────────────────────── */
export var ReviewLevel;
(function (ReviewLevel) {
    ReviewLevel["L0"] = "L0";
    ReviewLevel["L1"] = "L1";
    ReviewLevel["L2"] = "L2";
    ReviewLevel["L3"] = "L3";
})(ReviewLevel || (ReviewLevel = {}));
/* ── Execution Boundaries (E0–E3) ──────────────────────── */
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
export var ExecutionBoundary;
(function (ExecutionBoundary) {
    ExecutionBoundary["E0"] = "E0";
    ExecutionBoundary["E1"] = "E1";
    ExecutionBoundary["E2"] = "E2";
    ExecutionBoundary["E3"] = "E3";
})(ExecutionBoundary || (ExecutionBoundary = {}));
/**
 * Map each trigger category to its execution boundary level.
 * This determines which model may execute the change.
 */
const SEMANTIC_BOUNDARY_MAP = {
    /* ── E3: Opus Arbitration + External Review + Freeze Gate ── */
    model_routing_protocol: ExecutionBoundary.E3,
    freeze_gate_state_machine: ExecutionBoundary.E3,
    arbitration_ownership: ExecutionBoundary.E3,
    security_governance_invariant: ExecutionBoundary.E3,
    governance_runtime_boundary: ExecutionBoundary.E3,
    secret_boundary: ExecutionBoundary.E3,
    /* ── E2: Opus Plan Required Before Execution ─────────────── */
    provider_fallback_strategy: ExecutionBoundary.E2,
    cognitive_reviewer_contract: ExecutionBoundary.E2,
    routing_decision_log_schema: ExecutionBoundary.E2,
    architecture_diff_check_rules: ExecutionBoundary.E2,
    new_model_role_introduction: ExecutionBoundary.E2,
    drift_detection_logic: ExecutionBoundary.E2,
    /* ── E1: Batch Execution With Tests (DeepSeek) ───────────── */
    mock_provider: ExecutionBoundary.E1,
    non_breaking_cli_options: ExecutionBoundary.E1,
    internal_refactor: ExecutionBoundary.E1,
    /* ── E0: Free Execution (DeepSeek, no plan) ──────────────── */
    test_changes: ExecutionBoundary.E0,
    implementation_only: ExecutionBoundary.E0,
    docs_only: ExecutionBoundary.E0,
};
/* ── Trigger Matrix ────────────────────────────────────── */
const TRIGGER_LEVELS = {
    // L3 — changes decision authority, secret boundary, or constitutional boundaries
    model_routing_protocol: ReviewLevel.L3,
    freeze_gate_state_machine: ReviewLevel.L3,
    arbitration_ownership: ReviewLevel.L3,
    security_governance_invariant: ReviewLevel.L3,
    governance_runtime_boundary: ReviewLevel.L3,
    secret_boundary: ReviewLevel.L3,
    // L2 — changes governance contracts or drift detection
    provider_fallback_strategy: ReviewLevel.L2,
    cognitive_reviewer_contract: ReviewLevel.L2,
    routing_decision_log_schema: ReviewLevel.L2,
    architecture_diff_check_rules: ReviewLevel.L2,
    new_model_role_introduction: ReviewLevel.L2,
    drift_detection_logic: ReviewLevel.L2,
    // L0 — implementation detail, no decision-logic change
    test_changes: ReviewLevel.L0,
    internal_refactor: ReviewLevel.L0,
    mock_provider: ReviewLevel.L0,
    non_breaking_cli_options: ReviewLevel.L0,
    implementation_only: ReviewLevel.L0,
    docs_only: ReviewLevel.L0,
};
const TRIGGER_DESCRIPTIONS = {
    model_routing_protocol: "Changes to how models are selected for tasks",
    freeze_gate_state_machine: "Changes to the freeze gate state machine or valid transitions",
    arbitration_ownership: "Changes to who holds arbitration authority",
    security_governance_invariant: "Changes to security or governance invariant rules",
    governance_runtime_boundary: "Changes to the boundary between governance and runtime layers",
    provider_fallback_strategy: "Changes to provider fallback policy or behavior",
    cognitive_reviewer_contract: "Changes to CognitiveReviewInputV2 or CognitiveReviewOutputV2 schema",
    routing_decision_log_schema: "Changes to RoutingDecisionLog field structure",
    architecture_diff_check_rules: "Changes to diff-check gate rules or severity classification",
    secret_boundary: "Changes to how secrets or API keys are managed — escalated to L3 due to security impact",
    new_model_role_introduction: "Introduction of a new model-role pair in the routing chain",
    drift_detection_logic: "Changes to architecture drift detection logic",
    test_changes: "Test-only changes with no production impact",
    internal_refactor: "Internal refactoring with no external contract change",
    mock_provider: "Mock provider changes with no external impact",
    non_breaking_cli_options: "CLI option additions that don't change semantics",
    implementation_only: "Implementation details with no architecture decision change",
    docs_only: "Documentation-only changes",
};
const REVIEWER_MODEL_POLICY = {
    [ReviewLevel.L0]: {
        level: ReviewLevel.L0,
        model: "none",
        allowedAsFinalReviewer: false,
        purpose: "No external review required",
    },
    [ReviewLevel.L1]: {
        level: ReviewLevel.L1,
        model: "gpt-5.4-mini",
        allowedAsFinalReviewer: false,
        purpose: "Schema / batch review (advisory only)",
    },
    [ReviewLevel.L2]: {
        level: ReviewLevel.L2,
        model: "gpt-5.5",
        allowedAsFinalReviewer: false,
        purpose: "Architecture governance review",
    },
    [ReviewLevel.L3]: {
        level: ReviewLevel.L3,
        model: "gpt-5.5-pro",
        allowedAsFinalReviewer: false,
        purpose: "Freeze / final arbitration review",
    },
};
/* ── Public API ────────────────────────────────────────── */
/**
 * Classify a single trigger category into its review level.
 */
export function evaluateTrigger(category) {
    const level = TRIGGER_LEVELS[category];
    return {
        category,
        level,
        reason: TRIGGER_DESCRIPTIONS[category],
        requiresExternalReview: level === ReviewLevel.L2 || level === ReviewLevel.L3,
        requiresFreezeGate: level === ReviewLevel.L3,
    };
}
/**
 * Given a list of affected categories, return the highest
 * required review level.
 */
export function getReviewLevel(categories) {
    let max = ReviewLevel.L0;
    for (const cat of categories) {
        const lvl = TRIGGER_LEVELS[cat];
        if (levelToNumber(lvl) > levelToNumber(max)) {
            max = lvl;
        }
    }
    return max;
}
export function shouldRequireExternalReview(level) {
    return level === ReviewLevel.L2 || level === ReviewLevel.L3;
}
export function shouldEscalateToFreezeGate(level) {
    return level === ReviewLevel.L3;
}
export function getRequiredReviewerModel(level) {
    return REVIEWER_MODEL_POLICY[level];
}
/* ── Execution Boundary API ─────────────────────────────── */
/**
 * Classify the execution boundary for a set of trigger categories.
 * Returns the highest (most restrictive) boundary across all categories.
 */
export function classifyExecutionBoundary(categories) {
    if (!categories || categories.length === 0)
        return ExecutionBoundary.E0;
    let maxLevel = 0;
    for (const cat of categories) {
        const boundary = SEMANTIC_BOUNDARY_MAP[cat];
        const num = executionBoundaryToNumber(boundary);
        if (num > maxLevel)
            maxLevel = num;
    }
    switch (maxLevel) {
        case 3: return ExecutionBoundary.E3;
        case 2: return ExecutionBoundary.E2;
        case 1: return ExecutionBoundary.E1;
        default: return ExecutionBoundary.E0;
    }
}
/**
 * Whether this boundary requires an Opus-authored plan before execution.
 * E0 and E1 can be executed directly by DeepSeek; E2 and E3 require Opus.
 */
export function boundaryRequiresPlan(boundary) {
    return boundary === ExecutionBoundary.E2 || boundary === ExecutionBoundary.E3;
}
/**
 * Whether this boundary requires Opus Arbitration + External Review + Freeze Gate.
 * Only E3 requires full escalation.
 */
export function boundaryRequiresArbitration(boundary) {
    return boundary === ExecutionBoundary.E3;
}
/**
 * Get the recommended executor model for a given execution boundary.
 */
export function getRecommendedExecutor(boundary) {
    switch (boundary) {
        case ExecutionBoundary.E0: return "deepseek";
        case ExecutionBoundary.E1: return "deepseek";
        case ExecutionBoundary.E2: return "claude-opus";
        case ExecutionBoundary.E3: return "claude-opus";
    }
}
/**
 * Human-readable description of each execution boundary.
 */
export function describeExecutionBoundary(boundary) {
    switch (boundary) {
        case ExecutionBoundary.E0:
            return "E0 — Free Execution: DeepSeek can execute directly. No plan required. Tests, docs, type fixes, internal helpers, non-public implementation details.";
        case ExecutionBoundary.E1:
            return "E1 — Batch Execution With Tests: DeepSeek can execute directly. Provider adapters, CLI options, memory helpers, schema-compatible fields, eval cases.";
        case ExecutionBoundary.E2:
            return "E2 — Opus Plan Required: DeepSeek cannot execute without an Opus-authored plan. Review-runner main flow, cost guard execution order, replay trigger strategy, ADR lifecycle, freeze snapshot conditions.";
        case ExecutionBoundary.E3:
            return "E3 — Opus Arbitration + External Review + Freeze Gate: Cannot be executed by DeepSeek under any circumstances. Model Routing Protocol, Freeze Gate state machine, arbitration ownership, external reviewer authority, secret boundary, governance/runtime boundary, constitutional invariants, L2/L3 trigger matrix.";
    }
}
/**
 * Evaluate a routing log entry against the policy to detect
 * semantic or authority drift.
 */
export function evaluateRoutingDrift(entry) {
    const warnings = [];
    // Rule: MINI model cannot be the final reviewer
    if (entry.role === "COGNITIVE_REVIEWER" && entry.selectedModel.includes("mini")) {
        warnings.push("Mini model used as cognitive reviewer — not allowed for final review");
    }
    // Rule: Only Opus can arbitrate (COGNITIVE_REVIEWER role)
    if (entry.role === "COGNITIVE_REVIEWER" && entry.selectedModel !== "openai-reviewer") {
        warnings.push(`Non-standard cognitive reviewer model: ${entry.selectedModel}`);
    }
    // Rule: Architecture governor must be Opus
    if (entry.role === "ARCHITECTURE_GOVERNOR" && entry.selectedModel !== "claude-opus") {
        warnings.push(`Architecture governor should be claude-opus, got ${entry.selectedModel}`);
    }
    return {
        driftDetected: warnings.length > 0,
        warnings,
    };
}
/* ── Internal helpers ──────────────────────────────────── */
function levelToNumber(level) {
    switch (level) {
        case ReviewLevel.L0: return 0;
        case ReviewLevel.L1: return 1;
        case ReviewLevel.L2: return 2;
        case ReviewLevel.L3: return 3;
    }
}
function executionBoundaryToNumber(boundary) {
    switch (boundary) {
        case ExecutionBoundary.E0: return 0;
        case ExecutionBoundary.E1: return 1;
        case ExecutionBoundary.E2: return 2;
        case ExecutionBoundary.E3: return 3;
    }
}
/* ── Re-export for convenience ─────────────────────────── */
export { TRIGGER_LEVELS, TRIGGER_DESCRIPTIONS, REVIEWER_MODEL_POLICY, SEMANTIC_BOUNDARY_MAP };
//# sourceMappingURL=external-review-policy.js.map