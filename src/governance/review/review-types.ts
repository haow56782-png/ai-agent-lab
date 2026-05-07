/** ============================================================
 *  Cognitive Review Types — Review input/output contracts
 *
 *  Defines the structured interface between Claude Opus
 *  (architect), OpenAI (cognitive reviewer), and the freeze
 *  gate. The reviewer critiques but never rewrites architecture.
 *  ============================================================ */

export type ReviewVerdict = "APPROVE" | "APPROVE_WITH_CHANGES" | "REJECT";

export type ReviewSeverity = "critical" | "high" | "medium" | "low";

export type ReviewSeverityUppercase = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type ReviewDimension =
  | "hidden_assumptions"
  | "missing_invariants"
  | "coupling_risk"
  | "overengineering"
  | "underengineering"
  | "maintenance_risk"
  | "state_consistency"
  | "event_sourcing"
  | "cross_module_interaction"
  | "milestone_violation";

export interface ReviewFinding {
  dimension: ReviewDimension;
  severity: ReviewSeverity;
  description: string;
  location: string; // module or interface name
  recommendation: string;
}

export interface CognitiveReviewInput {
  architectureDraft: {
    title: string;
    adrId: string;
    context: string;
    decision: string;
    moduleBoundaries: string[];
    interfaces: string[];
    invariants: string[];
    acceptanceCriteria: string[];
  };
  existingMilestones: string[];
  systemInvariants: string[];
  evalBaseline: {
    testCount: number;
    evalCount: number;
  };
}

export interface CognitiveReviewOutput {
  verdict: ReviewVerdict;
  topRisks: ReviewFinding[];
  hiddenAssumptions: string[];
  missingInterfaces: string[];
  invariantGaps: string[];
  couplingRisks: string[];
  simplifications: string[];
  requiredChanges: string[];
  optionalImprovements: string[];
  finalRecommendation: string;
  reviewer: "openai" | "claude-opus" | "deepseek-pro";
  reviewedAt: string;
}

export interface ArbitrationInput {
  originalDraft: CognitiveReviewInput;
  reviewOutput: CognitiveReviewOutput;
  arbiterNotes?: string;
}

export interface ArbitrationOutput {
  verdict: ReviewVerdict;
  acceptedFindings: string[];
  rejectedFindings: string[];
  arbitrationRationale: string;
  amendedInterfaces?: string[];
  amendedInvariants?: string[];
  finalDecision: string;
  arbiter: "claude-opus";
  arbitratedAt: string;
}

/* ── P2.0 Protocol Upgrade Types ─────────────────────────────── */

/**
 * Provider error discrimination.
 */
export type ProviderErrorCode =
  | "MISSING_API_KEY"
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "INVALID_JSON"
  | "SCHEMA_VALIDATION_FAILED"
  | "PROVIDER_REJECTED";

/**
 * OpenAI 作为 External Cognitive Reviewer 的配置
 */
export interface OpenAIReviewerConfig {
  provider: "openai";
  model: string;
  endpoint: string;
  timeoutMs: number;
  maxRetries: number;
  retryBackoffMs: number;
  fallbackPolicy: "BLOCK_FREEZE" | "OPUS_ONLY_WITH_WARNING" | "DEFER_REVIEW";
}

export const DEFAULT_OPENAI_REVIEWER_CONFIG: OpenAIReviewerConfig = {
  provider: "openai",
  model: "gpt-4.1-mini",
  endpoint: "",
  timeoutMs: 120000,
  maxRetries: 2,
  retryBackoffMs: 1000,
  fallbackPolicy: "BLOCK_FREEZE",
};

/**
 * Expanded CognitiveReviewInput for the Freeze Gate pipeline.
 * Includes routing context and eval baseline for auditability.
 */
export interface CognitiveReviewInputV2 {
  architectureDraft: {
    adrId: string;
    title: string;
    context: string;
    decision: string;
    moduleBoundaries: string[];
    interfaces: string[];
    invariants: string[];
    acceptanceCriteria: string[];
  };
  existingMilestones: string[];
  systemInvariants: string[];
  evalBaseline: {
    testCount: number;
    evalScenarioCount: number;
    typecheckStatus: "PASS" | "FAIL" | "UNKNOWN";
  };
  routingContext: {
    primaryArchitect: "claude-opus";
    executionChain: ["deepseek-v4-pro", "deepseek-v4-flash"];
    reviewPurpose: "FREEZE_GATE";
  };
}

/**
 * Expanded CognitiveReviewOutput — structured review for Freeze Gate.
 * The reviewer never outputs implementation code or rewrites architecture.
 */
export interface CognitiveReviewOutputV2 {
  verdict: ReviewVerdict;
  topRisks: {
    id: string;
    description: string;
    severity: ReviewSeverityUppercase;
  }[];
  hiddenAssumptions: string[];
  missingInterfaces: string[];
  invariantGaps: string[];
  couplingRisks: string[];
  simplificationOpportunities: string[];
  requiredChangesBeforeFreeze: string[];
  optionalImprovements: string[];
  finalRecommendation: string;
  reviewerModel: string;
  reviewedAt: string;
}

/**
 * Diff-Check Gate — checks implementation plan against frozen architecture.
 * Must run before DeepSeek v4 Pro starts implementation.
 */
export interface ArchitectureDiffCheckInput {
  frozenInterfaces: string[];
  implementationPlan: string[];
  frozenInvariants: string[];
  proposedChanges: string[];
}

export interface ArchitectureDiffCheckOutput {
  status: "PASS" | "WARN" | "FAIL";
  breakingChanges: string[];
  invariantViolations: string[];
  driftWarnings: string[];
  requiresThaw: boolean;
}

/**
 * Architecture Thaw Request — formal protocol for modifying frozen architecture.
 */
export interface ArchitectureThawRequest {
  frozenArchitectureId: string;
  requestedBy: "claude-opus" | "deepseek-v4-pro" | "human";
  reason: string;
  impactAnalysis: string[];
  affectedInterfaces: string[];
  affectedInvariants: string[];
  requestedAt: string;
}

/**
 * Routing Audit Log — records every model selection decision.
 */
export interface RoutingDecisionLog {
  taskId: string;
  selectedModel: "claude-opus" | "deepseek-v4-pro" | "deepseek-v4-flash" | "openai-reviewer";
  role:
    | "ARCHITECTURE_GOVERNOR"
    | "COGNITIVE_REVIEWER"
    | "IMPLEMENTATION_PLANNER"
    | "MECHANICAL_EXECUTOR";
  reason: string;
  timestamp: string;
  inputSummary: string;
  outputSummary?: string;
}
