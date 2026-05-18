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
import type { BehaviorInput, BehaviorOutput } from "./types.js";
/**
 * Analyze player behavior from session data and detect
 * problematic patterns. Returns a BehaviorOutput with
 * state, intervention level, recommended action,
 * and decision adjustment for the Decision / Debate engines.
 */
export declare function analyzeBehavior(input: BehaviorInput): BehaviorOutput;
export type { BehaviorInput, BehaviorOutput, PatternMatch, BehaviorState, InterventionLevel, RecommendedAction, BetEntry, DecisionAdjustment } from "./types.js";
export type { TiltEvaluation } from "./tilt-detector.js";
//# sourceMappingURL=index.d.ts.map