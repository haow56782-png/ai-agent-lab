/** ============================================================
 *  Review Runner — Orchestrates the full review pipeline.
 *
 *  Pipeline:
 *    0. Governance Memory Replay (optional — pre-flight check)
 *    1. Cognitive Review (via injected provider or internal)
 *    2. Claude Opus Arbitration
 *    3. Freeze decision
 *    4. Governance Memory persistence (optional)
 *
 *  Supports provider injection so the pipeline can use OpenAI,
 *  mock, or future reviewers without code changes.
 *
 *  NOTE: This file must NEVER read API keys or secrets.
 *  ============================================================ */

import type { CognitiveReviewInput, CognitiveReviewOutput, RoutingDecisionLog } from "./review-types.js";
import { performCognitiveReview, arbitrateReview } from "./cognitive-review.js";
import { validateFreezeConditions, type FreezeValidationResult } from "../freeze-gate/freeze-validator.js";
import { createFreezeEntry, transitionFreeze, type FreezeGateEntry } from "../freeze-gate/freeze-state-machine.js";
import type { CognitiveReviewerProvider, ProviderReviewResult } from "./cognitive-reviewer-provider.js";
import { v1InputToV2, v2OutputToV1 } from "./cognitive-reviewer-provider.js";
import type { GovernanceMemoryStore, GovernanceMemoryEntry, FreezeSnapshot, GovernanceProposalCheck } from "../memory/governance-memory.js";
import type { DriftRiskLevel } from "../memory/governance-memory-types.js";
import { ReviewLevel, type TriggerCategory } from "./external-review-policy.js";
import { createDeterministicGovernanceId, type GovernanceReplayBlockResult } from "../memory/governance-memory-file.js";
import { GovernanceCostGuard, type CostGuardConfig, type ProposalMetadata, type CostGuardResult } from "../memory/governance-cost-guard.js";

/* ── Extended Input ────────────────────────────────────── */

export interface ReviewPipelineInput {
  architectureDraft: CognitiveReviewInput;
  existingMilestones: string[];
  systemInvariants: string[];
  evalBaseline: { testCount: number; evalCount: number };
  actor: string;
  /** Optional task ID to include in routing audit log. */
  taskId?: string;

  /* ── P3.0 Governance Memory integration ──────────────── */

  /** Governance memory store for pre-flight replay checks and post-review persistence. */
  governanceMemory?: GovernanceMemoryStore;
  /** Enable pre-flight governance replay checks (default: false). */
  enableGovernanceReplay?: boolean;
  /** List of invariants touched by this proposal (for governance tracking). */
  invariantsTouched?: string[];
  /** Freeze version label (used when creating freeze snapshots). */
  freezeVersion?: string;
  /** Whether this proposal requires freeze gate (set by pre-flight replay). */
  requiresFreezeGateOverride?: boolean;

  /* ── P3.1 Cost Guard ──────────────────────────────────── */

  /** Governance cost guard instance (injected). */
  costGuard?: GovernanceCostGuard;
  /** Cost guard configuration (enabled by default). */
  costGuardConfig?: CostGuardConfig;
  /** Trigger categories for local review level classification. */
  triggerCategories?: TriggerCategory[];
}

/* ── Extended Result ───────────────────────────────────── */

export interface ReviewPipelineResult {
  freezeEntry: FreezeGateEntry;
  reviewOutput: CognitiveReviewOutput;
  arbitrationResult: {
    verdict: "APPROVE" | "APPROVE_WITH_CHANGES" | "REJECT";
    acceptedFindings: string[];
    rejectedFindings: string[];
    finalDecision: string;
  };
  freezeValidation: FreezeValidationResult;
  passed: boolean;
  summary: string;
  /** Present when an external provider was used. */
  providerResult?: ProviderReviewResult;
  /** Routing audit log entry generated for this pipeline run. */
  routingDecision?: RoutingDecisionLog;

  /* ── P3.0 Governance Memory integration ──────────────── */

  /** Governance memory entry created after review (if governanceMemory was provided). */
  governanceMemoryEntry?: GovernanceMemoryEntry;
  /** Freeze snapshot created on FROZEN (if governanceMemory was provided). */
  freezeSnapshot?: FreezeSnapshot;
  /** Pre-flight governance replay result (if enableGovernanceReplay was true). */
  governanceReplay?: GovernanceProposalCheck;
  /** Whether freeze gate is required due to constitutional invariant violation. */
  requiresFreezeGate?: boolean;
  /** Governance memory entry ID for audit linking. */
  governanceEntryId?: string;
  /** Cost guard evaluation result (if cost guard was enabled). */
  costGuardResult?: CostGuardResult;
}

/* ── Pipeline ───────────────────────────────────────────── */

export async function runReviewPipeline(
  input: ReviewPipelineInput,
  reviewProvider?: CognitiveReviewerProvider,
): Promise<ReviewPipelineResult> {
  const { architectureDraft, actor } = input;
  const adrId = architectureDraft.architectureDraft.adrId;
  const invariantsTouched = input.invariantsTouched ?? [];

  // ── Step 0: Pre-flight Governance Memory Replay ──────────────
  let governanceReplay: GovernanceProposalCheck | undefined;
  let requiresFreezeGate = false;

  if (input.enableGovernanceReplay && input.governanceMemory) {
    const reviewLevel = reviewProvider ? ReviewLevel.L2 : ReviewLevel.L0;
    const reviewerModels = reviewProvider ? ["openai-reviewer", "claude-opus"] : ["claude-opus"];

    governanceReplay = input.governanceMemory.validateGovernanceProposal(
      adrId,
      architectureDraft.architectureDraft.decision,
      input.requiresFreezeGateOverride ? ReviewLevel.L3 : reviewLevel,
      "claude-opus",
      invariantsTouched,
      reviewerModels,
    );

    // Check constitutional invariant violation → requires L3 Freeze Gate
    const constitutionalFailures = governanceReplay.checks.filter(
      (c) => !c.passed && c.rule === "Constitutional changes require L3 Freeze Gate",
    );
    if (constitutionalFailures.length > 0) {
      requiresFreezeGate = true;
    }

    // Check if any CRITICAL authority drift is detected
    const authorityFailures = governanceReplay.checks.filter(
      (c) => !c.passed && (c.rule.includes("Opus") || c.rule.includes("External reviewer")),
    );
    if (authorityFailures.length > 0) {
      requiresFreezeGate = true;
    }
  }

  // ── Step 1: Cost Guard Evaluation (before any model call) ──────
  let costGuardResult: CostGuardResult | undefined;
  let costGuardBlocked = false;
  let localDecision = false;

  if (input.costGuard && input.costGuardConfig?.enabled !== false) {
    const config: CostGuardConfig = input.costGuardConfig ?? {
      enabled: true,
      maxCostTier: "MEDIUM_COST",
      allowL1ExternalReview: false,
      disableReviewCache: false,
      replayScope: "touched",
    };

    const metadata: ProposalMetadata = {
      title: architectureDraft.architectureDraft.title,
      description: architectureDraft.architectureDraft.context,
      triggerCategories: input.triggerCategories ?? [],
      adrId,
      decision: architectureDraft.architectureDraft.decision,
      freezeVersion: input.freezeVersion,
    };

    costGuardResult = input.costGuard.evaluate(metadata, config);

    if (costGuardResult.blocked) {
      costGuardBlocked = true;
    }

    // L0: local pass, skip external model entirely
    if (costGuardResult.reviewLevel === "L0") {
      localDecision = true;
    }

    // L1: default local pass unless explicitly allowed
    if (costGuardResult.reviewLevel === "L1" && !config.allowL1ExternalReview) {
      localDecision = true;
    }

    // Cached review — skip external model
    if (costGuardResult.cachedReviewUsed) {
      localDecision = true;
    }
  }

  // Step 2: Create freeze entry + submit for review
  let freezeEntry = createFreezeEntry(architectureDraft.architectureDraft.adrId, actor);
  freezeEntry = transitionFreeze(freezeEntry, "SUBMIT_FOR_REVIEW", actor, "Architecture ready for review");

  // Step 3: Cognitive Review (via provider or internal)
  let reviewOutput: CognitiveReviewOutput;
  let providerResult: ProviderReviewResult | undefined;
  let routingDecision: RoutingDecisionLog | undefined;

  if (costGuardBlocked) {
    return {
      freezeEntry,
      reviewOutput: {
        verdict: "REJECT" as const,
        topRisks: [],
        hiddenAssumptions: [],
        missingInterfaces: [],
        invariantGaps: [],
        couplingRisks: [],
        simplifications: [],
        requiredChanges: [],
        optionalImprovements: [costGuardResult?.blockReason ?? "Review governed proposal cost tier and retry"],
        finalRecommendation: costGuardResult?.blockReason ?? "Blocked by cost guard",
        reviewer: "claude-opus" as const,
        reviewedAt: new Date().toISOString(),
      },
      arbitrationResult: {
        verdict: "REJECT",
        acceptedFindings: [],
        rejectedFindings: ["Cost guard blocked execution"],
        finalDecision: costGuardResult?.blockReason ?? "Blocked by cost guard",
      },
      freezeValidation: { passed: false, checks: [] },
      passed: false,
      summary: `BLOCKED: Cost tier ${costGuardResult?.costTier ?? "UNKNOWN"} exceeds maximum allowed`,
      governanceReplay,
      requiresFreezeGate,
      costGuardResult,
    };
  }

  if (localDecision) {
    // Local-only decision — skip external provider
    reviewOutput = performCognitiveReview(architectureDraft);
    routingDecision = {
      taskId: input.taskId ?? `review-${architectureDraft.architectureDraft.adrId}`,
      selectedModel: "claude-opus" as const,
      role: "COGNITIVE_REVIEWER" as const,
      reason: `Cost guard classified as ${costGuardResult?.reviewLevel ?? "L0"} — local review, no external model call`,
      timestamp: new Date().toISOString(),
      inputSummary: `ADR: ${architectureDraft.architectureDraft.adrId}, local decision`,
      outputSummary: `verdict=${reviewOutput.verdict}`,
    };
  } else if (reviewProvider) {
    const v2Input = v1InputToV2(architectureDraft);
    providerResult = await reviewProvider.review(v2Input);
    reviewOutput = v2OutputToV1(providerResult.output);

    // Generate routing audit log entry
    routingDecision = {
      taskId: input.taskId ?? `review-${architectureDraft.architectureDraft.adrId}`,
      selectedModel: providerResult.fallbackUsed ? "claude-opus" : "openai-reviewer",
      role: providerResult.fallbackUsed ? "ARCHITECTURE_GOVERNOR" : "COGNITIVE_REVIEWER",
      reason: providerResult.fallbackUsed
        ? `OpenAI reviewer fallback (${providerResult.errorCode ?? "unknown"}) — delegated to Opus arbitration`
        : `OpenAI cognitive review for ${architectureDraft.architectureDraft.title}`,
      timestamp: new Date().toISOString(),
      inputSummary: `ADR: ${architectureDraft.architectureDraft.adrId}, ${architectureDraft.architectureDraft.moduleBoundaries.length} modules, ${architectureDraft.architectureDraft.interfaces.length} interfaces`,
      outputSummary: `verdict=${reviewOutput.verdict}, ${reviewOutput.requiredChanges.length} changes required`,
    };
  } else {
    reviewOutput = performCognitiveReview(architectureDraft);
  }

  // Step 3: Handle review verdict
  if (reviewOutput.verdict === "REJECT") {
    freezeEntry = transitionFreeze(freezeEntry, "REQUEST_CHANGES", actor, "Cognitive review rejected");
    return {
      freezeEntry,
      reviewOutput,
      arbitrationResult: {
        verdict: "REJECT",
        acceptedFindings: reviewOutput.requiredChanges,
        rejectedFindings: [],
        finalDecision: "Architecture rejected by cognitive review. See required changes.",
      },
      freezeValidation: { passed: false, checks: [] },
      passed: false,
      summary: `REJECTED: ${reviewOutput.requiredChanges.length} issues found`,
      providerResult,
      routingDecision,
      governanceReplay,
      requiresFreezeGate,
      costGuardResult,
    };
  }

  // Step 4: Send to arbitration
  freezeEntry = transitionFreeze(freezeEntry, "SEND_TO_ARBITRATION", actor, "Review complete, sending to arbitration");

  // Step 5: Claude Opus Arbitration
  const arbitrationResult = arbitrateReview(architectureDraft, reviewOutput);

  if (arbitrationResult.verdict === "REJECT") {
    freezeEntry = transitionFreeze(freezeEntry, "REQUEST_CHANGES", actor, "Arbitration rejected");
    return {
      freezeEntry,
      reviewOutput,
      arbitrationResult,
      freezeValidation: { passed: false, checks: [] },
      passed: false,
      summary: `REJECTED after arbitration: ${arbitrationResult.finalDecision}`,
      providerResult,
      routingDecision,
      governanceReplay,
      requiresFreezeGate,
      costGuardResult,
    };
  }

  // Step 6: Validate freeze conditions
  const freezeValidation = validateFreezeConditions({
    adr: {
      metadata: {
        id: architectureDraft.architectureDraft.adrId,
        title: architectureDraft.architectureDraft.title,
        status: "draft",
      },
      context: architectureDraft.architectureDraft.context,
      decision: architectureDraft.architectureDraft.decision,
      moduleBoundaries: architectureDraft.architectureDraft.moduleBoundaries,
      interfaces: architectureDraft.architectureDraft.interfaces,
      invariants: architectureDraft.architectureDraft.invariants,
      acceptanceCriteria: architectureDraft.architectureDraft.acceptanceCriteria,
    },
    moduleBoundaries: architectureDraft.architectureDraft.moduleBoundaries,
    interfaces: architectureDraft.architectureDraft.interfaces,
    invariants: architectureDraft.architectureDraft.invariants,
    acceptanceCriteria: architectureDraft.architectureDraft.acceptanceCriteria,
  });

  const passed = freezeValidation.passed;
  const isFrozen = passed;

  if (isFrozen) {
    freezeEntry = transitionFreeze(freezeEntry, "APPROVE", actor, "All freeze conditions met");
  } else {
    freezeEntry = transitionFreeze(freezeEntry, "REQUEST_CHANGES", actor, "Freeze conditions not met");
  }

  // ── Step 7: Governance Memory Persistence ────────────────────
  let governanceMemoryEntry: GovernanceMemoryEntry | undefined;
  let freezeSnapshot: FreezeSnapshot | undefined;
  let governanceEntryId: string | undefined;

  if (input.governanceMemory) {
    // Determine drift risk from replay results
    const driftRiskLevel: DriftRiskLevel = (() => {
      if (requiresFreezeGate) return "HIGH";
      if (invariantsTouched.length > 0) return "MEDIUM";
      return "LOW";
    })();

    // Determine reviewer models
    const reviewerModels: string[] = [];
    if (reviewProvider) reviewerModels.push(providerResult?.fallbackUsed ? "claude-opus" : "openai-reviewer");
    reviewerModels.push("claude-opus"); // Arbiter

    // Create governance memory entry
    governanceMemoryEntry = input.governanceMemory.createGovernanceMemoryEntry({
      decisionId: createDeterministicGovernanceId(
        "DEC",
        adrId,
        architectureDraft.architectureDraft.decision.slice(0, 40),
      ),
      adrId,
      reviewLevel: requiresFreezeGate ? ReviewLevel.L3 : (reviewProvider ? ReviewLevel.L2 : ReviewLevel.L0),
      reviewerModels,
      arbitrationOwner: "claude-opus",
      freezeVersion: input.freezeVersion ?? "",
      invariantsTouched,
      driftRiskLevel,
      relatedADRIds: [],
      auditLogIds: [],
      routingDecisionLogIds: routingDecision ? [createDeterministicGovernanceId("RD", routingDecision.taskId, routingDecision.selectedModel)] : [],
    });

    governanceEntryId = governanceMemoryEntry.id;

    // Create freeze snapshot if FROZEN
    if (isFrozen && input.freezeVersion) {
      freezeSnapshot = input.governanceMemory.createFreezeSnapshot({
        adrId,
        freezeVersion: input.freezeVersion,
        frozenBy: actor,
        invariantsCaptured: invariantsTouched,
        relatedEntryIds: [governanceMemoryEntry.id],
        decisionHash: governanceMemoryEntry.decisionHash,
      });
    }
  }

  return {
    freezeEntry,
    reviewOutput,
    arbitrationResult,
    freezeValidation,
    passed,
    summary: isFrozen
      ? `ARCHITECTURE FROZEN: ${architectureDraft.architectureDraft.title}`
      : `CHANGES REQUIRED: ${freezeValidation.checks.filter((c) => !c.passed).length} checks failed`,
    providerResult,
    routingDecision,
    governanceReplay,
    requiresFreezeGate,
    governanceMemoryEntry,
    freezeSnapshot,
    governanceEntryId,
    costGuardResult,
  };
}
