/** ============================================================
 *  Cognitive Review — Structured architecture review logic.
 *
 *  Implements the Cognitive Reviewer role: identifies hidden
 *  assumptions, missing invariants, coupling risks, and other
 *  architecture issues without rewriting the architecture.
 *  ============================================================ */

import type {
  CognitiveReviewInput,
  CognitiveReviewOutput,
  ReviewFinding,
  ReviewVerdict,
} from "./review-types.js";

export function performCognitiveReview(input: CognitiveReviewInput): CognitiveReviewOutput {
  const findings: ReviewFinding[] = [];
  const hiddenAssumptions: string[] = [];
  const missingInterfaces: string[] = [];
  const invariantGaps: string[] = [];
  const couplingRisks: string[] = [];
  const simplifications: string[] = [];
  const requiredChanges: string[] = [];
  const optionalImprovements: string[] = [];

  // 1. Check module boundaries are specific enough
  if (input.architectureDraft.moduleBoundaries.length === 0) {
    findings.push({
      dimension: "hidden_assumptions",
      severity: "high",
      description: "No module boundaries defined — implementation scope is ambiguous",
      location: "moduleBoundaries",
      recommendation: "Define explicit directory/file boundaries for each module",
    });
    requiredChanges.push("Define module boundaries (src/governance/ subdirectories)");
  }

  // 2. Check interface completeness
  if (input.architectureDraft.interfaces.length === 0) {
    findings.push({
      dimension: "underengineering",
      severity: "high",
      description: "No interfaces defined — cannot validate implementation against architecture",
      location: "interfaces",
      recommendation: "Define all public interfaces before freeze",
    });
    requiredChanges.push("Define interfaces/types for each module");
  }

  // 3. Check invariants
  if (input.architectureDraft.invariants.length === 0) {
    findings.push({
      dimension: "missing_invariants",
      severity: "medium",
      description: "No invariants documented — system constraints are implicit",
      location: "invariants",
      recommendation: "Document key invariants (e.g., 'ADR IDs are unique', 'Freeze is required before implementation')",
    });
    invariantGaps.push("No invariants documented");
    optionalImprovements.push("Add system invariants for freeze gate, ADR immutability, routing uniqueness");
  }

  // 4. Check acceptance criteria
  if (input.architectureDraft.acceptanceCriteria.length === 0) {
    findings.push({
      dimension: "underengineering",
      severity: "high",
      description: "No acceptance criteria — cannot verify completion",
      location: "acceptanceCriteria",
      recommendation: "Define measurable acceptance criteria",
    });
    requiredChanges.push("Define acceptance criteria (typecheck, test count, eval count)");
  }

  // 5. Cross-module coupling risk
  const moduleCount = input.architectureDraft.moduleBoundaries.length;
  if (moduleCount > 7) {
    findings.push({
      dimension: "coupling_risk",
      severity: "medium",
      description: `${moduleCount} modules may introduce cross-module coupling`,
      location: "moduleBoundaries",
      recommendation: "Review if all modules are necessary or if some can be merged",
    });
    couplingRisks.push(`${moduleCount} modules — potential coupling risk`);
  }

  // 6. Check ADR decision clarity
  if (input.architectureDraft.decision.length < 20) {
    findings.push({
      dimension: "hidden_assumptions",
      severity: "low",
      description: "Decision statement is very short — may hide assumptions",
      location: "decision",
      recommendation: "Expand decision to cover all key choices",
    });
    hiddenAssumptions.push("Decision statement is brief — verify all tradeoffs are documented");
  }

  // 7. Architecture vs milestones
  for (const milestone of input.existingMilestones) {
    if (!input.architectureDraft.moduleBoundaries.some((b) => milestone.includes(b))) {
      optionalImprovements.push(`Verify alignment with milestone: ${milestone}`);
    }
  }

  // Build verdict
  const hasCriticalOrHigh = findings.some((f) => f.severity === "critical" || f.severity === "high");
  const verdict: ReviewVerdict = requiredChanges.length > 0
    ? hasCriticalOrHigh ? "REJECT" : "APPROVE_WITH_CHANGES"
    : "APPROVE";

  if (simplifications.length === 0 && moduleCount > 3) {
    simplifications.push(`Consider if all ${moduleCount} modules are necessary for v0.1`);
  }

  return {
    verdict,
    topRisks: findings.slice(0, 5),
    hiddenAssumptions,
    missingInterfaces,
    invariantGaps,
    couplingRisks,
    simplifications,
    requiredChanges,
    optionalImprovements,
    finalRecommendation: requiredChanges.length > 0
      ? `Address ${requiredChanges.length} required change(s) before freeze`
      : "Architecture is ready for freeze",
    reviewer: "openai",
    reviewedAt: new Date().toISOString(),
  };
}

/**
 * Claude Opus arbitration of the review output.
 */
export function arbitrateReview(
  input: CognitiveReviewInput,
  reviewOutput: CognitiveReviewOutput,
  arbiterNotes?: string,
): {
  verdict: "APPROVE" | "APPROVE_WITH_CHANGES" | "REJECT";
  acceptedFindings: string[];
  rejectedFindings: string[];
  finalDecision: string;
} {
  const acceptedFindings: string[] = [];
  const rejectedFindings: string[] = [];

  for (const finding of reviewOutput.topRisks) {
    if (finding.severity === "critical" || finding.severity === "high") {
      acceptedFindings.push(`[${finding.severity}] ${finding.description}`);
    } else {
      rejectedFindings.push(`[${finding.severity}] ${finding.description} — accepted but deferred`);
    }
  }

  // Accept all required changes by default
  for (const change of reviewOutput.requiredChanges) {
    acceptedFindings.push(`Required change: ${change}`);
  }

  const hasRejectedRequired = reviewOutput.verdict === "REJECT";
  const finalVerdict = hasRejectedRequired ? "REJECT" : "APPROVE_WITH_CHANGES";

  const finalDecision = arbiterNotes
    ? `${finalVerdict}: ${arbiterNotes}`
    : `${finalVerdict}: ${reviewOutput.requiredChanges.length} required changes identified`;

  return {
    verdict: finalVerdict as "APPROVE" | "APPROVE_WITH_CHANGES" | "REJECT",
    acceptedFindings,
    rejectedFindings,
    finalDecision,
  };
}
