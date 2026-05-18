/** ============================================================
 *  Crash — Multiplier-target probability prediction
 *
 *  Crash games use a provably fair algorithm where the crash
 *  point is determined by:  crashPoint = (1 - houseEdge) / (1 - r)
 *  where r ∈ [0, 1).  The probability of reaching at least a
 *  given multiplier M is:  P(crash >= M) = (1 - houseEdge) / M
 *
 *  This is a high-variance game.  Long losing streaks are
 *  statistically expected.
 *  ============================================================ */
import type { CrashInput, Signal, RiskProfile } from "./types.js";
export declare function getRiskProfile(): RiskProfile;
export interface ValidatedCrashInput {
    targetMultiplier: number;
    previousCrashPoints: number[];
}
export declare function parseCrashInput(input: CrashInput): ValidatedCrashInput;
/**
 * Probability that the crash point is AT LEAST the given multiplier.
 *
 *   P(crash >= M) = (1 - houseEdge) / M
 *
 * This is the core formula used by most crash games.
 */
export declare function calculateProbability(multiplier: number): number;
export declare function calculateConfidence(probability: number, historyLength: number): number;
export declare function generateRecommendation(probability: number): {
    recommendation: "BET" | "SKIP" | "CAUTION";
    riskLevel: "LOW" | "MEDIUM" | "HIGH" | "EXTREME";
};
export declare function getExplanation(parsed: ValidatedCrashInput, probability: number): string;
export declare function generateSignal(input: CrashInput): Signal;
//# sourceMappingURL=crash.d.ts.map