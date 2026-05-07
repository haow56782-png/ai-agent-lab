/** ============================================================
 *  Player Behavior Modeling Engine — Entry point
 *
 *  Analyzes player behavior to detect tilt, loss chasing,
 *  fatigue, risk mismatches, and other problematic patterns.
 *  Produces intervention recommendations for the Decision /
 *  Debate engines.
 *
 *  Pipeline:
 *    1. Build session state from bet history + bankroll
 *    2. Run pattern detectors (loss chasing, overbet, etc.)
 *    3. Evaluate tilt from losses + escalation
 *    4. Evaluate fatigue from session duration
 *    5. Determine behavior state + intervention level
 *  ============================================================ */

import { buildSessionState } from "./session-state.js";
import { detectAllPatterns } from "./pattern-detector.js";
import { evaluateTilt, evaluateFatigue } from "./tilt-detector.js";
import {
  determineBehaviorState,
  determineIntervention,
  computeDecisionAdjustment,
  generateInterventionReasoning,
  collectBehaviorWarnings,
} from "./intervention.js";
import type { BehaviorInput, BehaviorOutput, PatternMatch, DecisionAdjustment } from "./types.js";
import type { TiltEvaluation } from "./tilt-detector.js";

/**
 * Analyze player behavior from session data and detect
 * problematic patterns. Returns a BehaviorOutput with
 * state, intervention level, recommended action,
 * and decision adjustment for the Decision / Debate engines.
 */
export function analyzeBehavior(input: BehaviorInput): BehaviorOutput {
  // 1. Build session state
  const sessionState = buildSessionState(
    input.betHistory,
    input.bankrollHistory,
    input.sessionDurationMinutes,
    input.recentResults,
  );

  // 2. Detect patterns
  const patterns: PatternMatch[] = detectAllPatterns(
    input.betHistory,
    input.recentResults,
    input.maxLoss,
    input.riskPreference,
    sessionState,
  );

  // 3. Evaluate tilt
  const tiltEval: TiltEvaluation = evaluateTilt(
    input.betHistory,
    input.recentResults,
    sessionState,
    patterns,
  );

  // 4. Evaluate fatigue
  const fatigue = evaluateFatigue(
    input.sessionDurationMinutes,
    sessionState.totalBets,
  );

  // 5. Determine behavior state
  const behaviorState = determineBehaviorState(patterns, tiltEval, fatigue);

  // 6. Determine intervention
  const { interventionLevel, recommendedAction } = determineIntervention(behaviorState, patterns);

  // 7. Compute decision adjustment for Decision Engine / Debate Engine
  const decisionAdjustment: DecisionAdjustment = computeDecisionAdjustment(
    behaviorState,
    input.currentDecision.action,
  );

  // 8. Build output
  const reasoning = generateInterventionReasoning(
    behaviorState,
    interventionLevel,
    patterns,
    tiltEval,
    fatigue,
  );

  const warnings = collectBehaviorWarnings(patterns, tiltEval, fatigue);

  return {
    behaviorState,
    detectedPatterns: patterns,
    interventionLevel,
    recommendedAction,
    decisionAdjustment,
    reasoning,
    warnings,
  };
}

export type { BehaviorInput, BehaviorOutput, PatternMatch, BehaviorState, InterventionLevel, RecommendedAction, BetEntry, DecisionAdjustment } from "./types.js";
export type { TiltEvaluation } from "./tilt-detector.js";
