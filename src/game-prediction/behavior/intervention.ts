/** ============================================================
 *  Intervention Engine — Determines the appropriate
 *  intervention level and recommended action based on
 *  detected behavior patterns, tilt state, and fatigue.
 *
 *  Intervention levels (escalating):
 *    NONE          → keep current decision
 *    SOFT_WARNING  → add warnings, reduce confidence
 *    HARD_WARNING  → downgrade action
 *    FORCE_STOP    → stop session immediately
 *  ============================================================ */

import type { PatternMatch, BehaviorState, InterventionLevel, RecommendedAction, DecisionAdjustment } from "./types.js";
import type { TiltEvaluation } from "./tilt-detector.js";

/* ─── Severity weights ─── */

const SEVERITY_WEIGHTS = { low: 1, medium: 2, high: 3, critical: 4 };

/**
 * Compute weighted pattern severity score.
 */
function patternSeverityScore(patterns: PatternMatch[]): number {
  return patterns.reduce((s, p) => s + (SEVERITY_WEIGHTS[p.severity] ?? 0), 0);
}

/**
 * Determine behavior state from all signals.
 */
export function determineBehaviorState(
  patterns: PatternMatch[],
  tiltEval: TiltEvaluation,
  fatigue: { isFatigued: boolean; fatigueLevel: string },
): BehaviorState {
  // Check for stop-required conditions first (highest priority)
  const hasCriticalLossChasing = patterns.some(
    (p) => p.pattern === "loss_chasing" && p.severity === "critical",
  );
  const hasCriticalMaxLoss = patterns.some(
    (p) => p.pattern === "over_max_loss" && p.severity === "critical",
  );
  const hasCriticalMismatch = patterns.some(
    (p) => p.pattern === "risk_mismatch" && p.severity === "critical",
  );

  if (hasCriticalLossChasing || hasCriticalMaxLoss) return "STOP_REQUIRED";
  if (tiltEval.isTilt && tiltEval.tiltScore > 0.7) return "STOP_REQUIRED";

  // Check for tilt / chasing loss
  if (tiltEval.isTilt) return "TILT";
  if (patterns.some((p) => p.pattern === "loss_chasing" && p.severity === "high")) return "CHASING_LOSS";

  // Check for fatigue
  if (fatigue.isFatigued && fatigue.fatigueLevel === "severe") return "STOP_REQUIRED";
  if (fatigue.isFatigued && fatigue.fatigueLevel === "moderate") return "FATIGUE";

  // Check for caution conditions
  if (hasCriticalMismatch) return "CAUTION";
  if (patternSeverityScore(patterns) >= 4) return "CAUTION";

  // Check misc patterns
  if (patterns.length > 0) return "CAUTION";

  return "NORMAL";
}

/**
 * Determine intervention level and recommended action from behavior state.
 */
export function determineIntervention(
  behaviorState: BehaviorState,
  patterns: PatternMatch[],
): { interventionLevel: InterventionLevel; recommendedAction: RecommendedAction } {
  const maxSeverity = patterns.length > 0
    ? Math.max(...patterns.map((p) => SEVERITY_WEIGHTS[p.severity]))
    : 0;

  switch (behaviorState) {
    case "STOP_REQUIRED":
      return { interventionLevel: "FORCE_STOP", recommendedAction: "STOP_SESSION" };

    case "TILT":
      return { interventionLevel: "FORCE_STOP", recommendedAction: "STOP_SESSION" };

    case "CHASING_LOSS":
      return maxSeverity >= 3
        ? { interventionLevel: "FORCE_STOP", recommendedAction: "STOP_SESSION" }
        : { interventionLevel: "HARD_WARNING", recommendedAction: "DOWNGRADE" };

    case "FATIGUE":
      return maxSeverity >= 3
        ? { interventionLevel: "FORCE_STOP", recommendedAction: "STOP_SESSION" }
        : { interventionLevel: "HARD_WARNING", recommendedAction: "DOWNGRADE" };

    case "CAUTION":
      return maxSeverity >= 3
        ? { interventionLevel: "HARD_WARNING", recommendedAction: "DOWNGRADE" }
        : { interventionLevel: "SOFT_WARNING", recommendedAction: "KEEP" };

    default:
      return { interventionLevel: "NONE", recommendedAction: "KEEP" };
  }
}

/**
 * Compute decision adjustment based on behavior analysis.
 * Maps behavior state to a concrete decision adjustment for
 * the Decision Engine / Debate Engine.
 */
export function computeDecisionAdjustment(
  behaviorState: BehaviorState,
  currentAction: "PLAY" | "SKIP" | "REDUCE_SIZE" | "STOP_SESSION",
): DecisionAdjustment {
  switch (behaviorState) {
    case "STOP_REQUIRED":
    case "TILT":
      return {
        shouldDowngrade: true,
        newAction: "STOP_SESSION",
        confidenceReduction: 0.4,
        reason: `${behaviorState}: player behavior requires session stop.`,
      };

    case "CHASING_LOSS":
      return {
        shouldDowngrade: true,
        newAction: currentAction === "PLAY" ? "REDUCE_SIZE" : currentAction === "REDUCE_SIZE" ? "STOP_SESSION" : currentAction,
        confidenceReduction: 0.25,
        reason: "CHASING_LOSS: player increasing bets after consecutive losses. Reducing action.",
      };

    case "FATIGUE":
      return {
        shouldDowngrade: true,
        newAction: currentAction === "PLAY" ? "REDUCE_SIZE" : currentAction,
        confidenceReduction: 0.2,
        reason: "FATIGUE: extended session duration detected. Reducing bet size recommended.",
      };

    case "CAUTION":
      return {
        shouldDowngrade: false,
        newAction: currentAction,
        confidenceReduction: 0.1,
        reason: "CAUTION: behavioral concerns detected. Confidence reduced.",
      };

    default:
      return {
        shouldDowngrade: false,
        newAction: currentAction,
        confidenceReduction: 0,
        reason: "NORMAL: no behavioral intervention needed.",
      };
  }
}

/**
 * Generate reasoning string explaining the intervention.
 */
export function generateInterventionReasoning(
  behaviorState: BehaviorState,
  interventionLevel: InterventionLevel,
  patterns: PatternMatch[],
  tiltEval: TiltEvaluation,
  fatigue: { isFatigued: boolean; fatigueLevel: string; reason: string },
): string {
  const parts: string[] = [`Behavior state: ${behaviorState}`];

  if (patterns.length > 0) {
    const topPattern = patterns.reduce((a, b) =>
      SEVERITY_WEIGHTS[a.severity] > SEVERITY_WEIGHTS[b.severity] ? a : b,
    );
    parts.push(`Key concern: ${topPattern.description}`);
  }

  if (tiltEval.isTilt) {
    parts.push(`Tilt detected (score: ${tiltEval.tiltScore}). Factors: ${tiltEval.contributingFactors.join("; ")}`);
  }

  if (fatigue.isFatigued) {
    parts.push(fatigue.reason);
  }

  if (interventionLevel === "FORCE_STOP") {
    parts.push("Immediate intervention: Force stop session.");
  } else if (interventionLevel === "HARD_WARNING") {
    parts.push("Hard warning: Action should be downgraded.");
  } else if (interventionLevel === "SOFT_WARNING") {
    parts.push("Soft warning: Monitor behavior closely, reduce confidence.");
  }

  return parts.join(". ");
}

/**
 * Collect all warnings from patterns and tilt evaluation.
 */
export function collectBehaviorWarnings(
  patterns: PatternMatch[],
  tiltEval: TiltEvaluation,
  fatigue: { isFatigued: boolean; fatigueLevel: string; reason: string },
): string[] {
  const warnings: string[] = [];

  for (const p of patterns) {
    warnings.push(`[${p.severity}] ${p.description}`);
  }

  if (tiltEval.isTilt) {
    warnings.push(`[high] Tilt detected (score: ${tiltEval.tiltScore}). ${tiltEval.contributingFactors.join("; ")}`);
  }

  if (fatigue.isFatigued) {
    warnings.push(`[${fatigue.fatigueLevel}] ${fatigue.reason}`);
  }

  return warnings;
}
