/** ============================================================
 *  Cognitive Reviewer Provider — Interface & result types
 *
 *  Abstracts the external Cognitive Reviewer behind a common
 *  interface so the review pipeline can switch between OpenAI,
 *  mock, or future providers without code changes.
 *  ============================================================ */

import type {
  CognitiveReviewInput,
  CognitiveReviewInputV2,
  CognitiveReviewOutput,
  CognitiveReviewOutputV2,
  ReviewSeverity,
  ReviewDimension,
  ProviderErrorCode,
} from "./review-types.js";

export interface CognitiveReviewerProvider {
  readonly name: string;
  review(input: CognitiveReviewInputV2): Promise<ProviderReviewResult>;
}

export interface ProviderReviewResult {
  output: CognitiveReviewOutputV2;
  providerName: string;
  modelUsed: string;
  fallbackUsed: boolean;
  latencyMs: number;
  /** Set when the provider encountered a specific error. */
  errorCode?: ProviderErrorCode;
  /** Truncated raw response text when JSON parsing failed. */
  rawResponseSummary?: string;
}

/** Fallback result returned when the provider cannot be reached. */
export function createFallbackResult(
  reason: string,
  modelUsed = "fallback",
  errorCode?: ProviderErrorCode,
  rawResponseSummary?: string,
): ProviderReviewResult {
  return {
    output: {
      verdict: "APPROVE_WITH_CHANGES",
      topRisks: [
        {
          id: "FALLBACK-001",
          description: `OpenAI reviewer unavailable: ${reason}. Review deferred to Opus arbitration.`,
          severity: "MEDIUM",
        },
      ],
      hiddenAssumptions: ["OpenAI cognitive review was not performed"],
      missingInterfaces: [],
      invariantGaps: [],
      couplingRisks: [],
      simplificationOpportunities: [],
      requiredChangesBeforeFreeze: ["OpenAI review not completed — verify architecture manually"],
      optionalImprovements: [],
      finalRecommendation: "OpenAI reviewer unavailable. Manual Opus arbitration required.",
      reviewerModel: modelUsed,
      reviewedAt: new Date().toISOString(),
    },
    providerName: "openai",
    modelUsed,
    fallbackUsed: true,
    latencyMs: 0,
    errorCode,
    rawResponseSummary,
  };
}

/* ── V1 ↔ V2 mapping helpers ───────────────────────────── */

export function v1InputToV2(input: CognitiveReviewInput): CognitiveReviewInputV2 {
  return {
    architectureDraft: {
      adrId: input.architectureDraft.adrId,
      title: input.architectureDraft.title,
      context: input.architectureDraft.context,
      decision: input.architectureDraft.decision,
      moduleBoundaries: input.architectureDraft.moduleBoundaries,
      interfaces: input.architectureDraft.interfaces,
      invariants: input.architectureDraft.invariants,
      acceptanceCriteria: input.architectureDraft.acceptanceCriteria,
    },
    existingMilestones: input.existingMilestones,
    systemInvariants: input.systemInvariants,
    evalBaseline: {
      testCount: input.evalBaseline.testCount,
      evalScenarioCount: input.evalBaseline.evalCount,
      typecheckStatus: "UNKNOWN",
    },
    routingContext: {
      primaryArchitect: "claude-opus",
      executionChain: ["deepseek-v4-pro", "deepseek-v4-flash"],
      reviewPurpose: "FREEZE_GATE",
    },
  };
}

export function v2OutputToV1(v2: CognitiveReviewOutputV2): CognitiveReviewOutput {
  const severityMap: Record<string, ReviewSeverity> = {
    CRITICAL: "critical",
    HIGH: "high",
    MEDIUM: "medium",
    LOW: "low",
  };

  return {
    verdict: v2.verdict,
    topRisks: v2.topRisks.map((r) => ({
      dimension: "hidden_assumptions" as ReviewDimension,
      severity: severityMap[r.severity] ?? "medium",
      description: r.description,
      location: "architecture",
      recommendation: r.description,
    })),
    hiddenAssumptions: v2.hiddenAssumptions,
    missingInterfaces: v2.missingInterfaces,
    invariantGaps: v2.invariantGaps,
    couplingRisks: v2.couplingRisks,
    simplifications: v2.simplificationOpportunities,
    requiredChanges: v2.requiredChangesBeforeFreeze,
    optionalImprovements: v2.optionalImprovements,
    finalRecommendation: v2.finalRecommendation,
    reviewer: "openai",
    reviewedAt: v2.reviewedAt,
  };
}
