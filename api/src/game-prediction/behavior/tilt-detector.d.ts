/** ============================================================
 *  Tilt Detector — Identifies emotional/behavioral tilt based
 *  on consecutive losses, bet size escalation, and combined
 *  risk signals.
 *
 *  Tilt indicators:
 *    - 3+ consecutive losses
 *    - Bet size escalation during loss streak
 *    - Win/loss ratio < 0.3 in current session
 *    - Combined pattern severity crossing tilt threshold
 *  ============================================================ */
import type { BetEntry, PatternMatch, SessionState } from "./types.js";
export interface TiltEvaluation {
    isTilt: boolean;
    tiltScore: number;
    contributingFactors: string[];
}
/**
 * Evaluate whether the player is in a tilt state.
 */
export declare function evaluateTilt(betHistory: BetEntry[], recentResults: Array<"win" | "loss">, sessionState: SessionState, patterns: PatternMatch[]): TiltEvaluation;
/**
 * Check for severe fatigue based on session duration and bet count.
 */
export declare function evaluateFatigue(sessionDurationMinutes: number, totalBets: number): {
    isFatigued: boolean;
    fatigueLevel: "none" | "mild" | "moderate" | "severe";
    reason: string;
};
//# sourceMappingURL=tilt-detector.d.ts.map