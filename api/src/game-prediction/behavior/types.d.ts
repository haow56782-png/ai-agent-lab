/** ============================================================
 *  Player Behavior Modeling Engine — Types
 *
 *  Analyzes player behavior patterns to detect tilt, loss
 *  chasing, fatigue, and risk-preference mismatches. Outputs
 *  intervention recommendations for the Decision / Debate
 *  engines.
 *  ============================================================ */
import type { RiskPreference, DecisionOutput } from "../decision-engine/types.js";
import type { LearningOutput } from "../learning/types.js";
export type BehaviorState = "NORMAL" | "CAUTION" | "TILT" | "CHASING_LOSS" | "FATIGUE" | "STOP_REQUIRED";
export type DetectedPattern = "loss_chasing" | "over_max_loss" | "high_frequency" | "overbet_after_win" | "session_fatigue" | "risk_mismatch";
export type InterventionLevel = "NONE" | "SOFT_WARNING" | "HARD_WARNING" | "FORCE_STOP";
export type RecommendedAction = "KEEP" | "DOWNGRADE" | "STOP_SESSION";
export interface DecisionAdjustment {
    shouldDowngrade: boolean;
    newAction: "PLAY" | "SKIP" | "REDUCE_SIZE" | "STOP_SESSION";
    confidenceReduction: number;
    reason: string;
}
export interface BetEntry {
    timestamp: string;
    betSize: number;
    result: "win" | "loss";
    payout: number;
    bankrollAfter: number;
}
export interface SessionState {
    totalBets: number;
    sessionDurationMinutes: number;
    averageBetSize: number;
    betFrequencyPerMinute: number;
    currentStreak: {
        type: "win" | "loss";
        count: number;
    };
    totalProfitLoss: number;
    peakBankroll: number;
    currentBankroll: number;
    recentBetSizes: number[];
    recentResults: Array<"win" | "loss">;
    lastBetTimestamps: string[];
}
export interface BehaviorInput {
    recentResults: Array<"win" | "loss">;
    bankrollHistory: number[];
    betHistory: BetEntry[];
    sessionDurationMinutes: number;
    riskPreference: RiskPreference;
    currentDecision: DecisionOutput;
    learningOutput?: LearningOutput;
    maxLoss?: number;
    timestamp: string;
}
export interface PatternMatch {
    pattern: DetectedPattern;
    severity: "low" | "medium" | "high" | "critical";
    description: string;
    detail: string;
}
export interface BehaviorOutput {
    behaviorState: BehaviorState;
    detectedPatterns: PatternMatch[];
    interventionLevel: InterventionLevel;
    recommendedAction: RecommendedAction;
    decisionAdjustment: DecisionAdjustment;
    reasoning: string;
    warnings: string[];
}
//# sourceMappingURL=types.d.ts.map