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
/**
 * Determine behavior state from all signals.
 */
export declare function determineBehaviorState(patterns: PatternMatch[], tiltEval: TiltEvaluation, fatigue: {
    isFatigued: boolean;
    fatigueLevel: string;
}): BehaviorState;
/**
 * Determine intervention level and recommended action from behavior state.
 */
export declare function determineIntervention(behaviorState: BehaviorState, patterns: PatternMatch[]): {
    interventionLevel: InterventionLevel;
    recommendedAction: RecommendedAction;
};
/**
 * Compute decision adjustment based on behavior analysis.
 * Maps behavior state to a concrete decision adjustment for
 * the Decision Engine / Debate Engine.
 */
export declare function computeDecisionAdjustment(behaviorState: BehaviorState, currentAction: "PLAY" | "SKIP" | "REDUCE_SIZE" | "STOP_SESSION"): DecisionAdjustment;
/**
 * Generate reasoning string explaining the intervention.
 */
export declare function generateInterventionReasoning(behaviorState: BehaviorState, interventionLevel: InterventionLevel, patterns: PatternMatch[], tiltEval: TiltEvaluation, fatigue: {
    isFatigued: boolean;
    fatigueLevel: string;
    reason: string;
}): string;
/**
 * Collect all warnings from patterns and tilt evaluation.
 */
export declare function collectBehaviorWarnings(patterns: PatternMatch[], tiltEval: TiltEvaluation, fatigue: {
    isFatigued: boolean;
    fatigueLevel: string;
    reason: string;
}): string[];
//# sourceMappingURL=intervention.d.ts.map