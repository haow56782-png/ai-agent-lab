/** ============================================================
 *  Risk Engine — Bankroll management
 *
 *  Handles bankroll exposure, overbet detection, risk of ruin,
 *  and session stop conditions.
 *  ============================================================ */
import type { BankrollStatus } from "./types.js";
import type { RiskPreference } from "../decision-engine/types.js";
declare const EXPOSURE_LIMITS: Record<RiskPreference, {
    maxExposure: number;
    warning: number;
    severe: number;
}>;
declare const CONSECUTIVE_LOSS_LIMITS: Record<RiskPreference, number>;
declare const STOP_LOSS_FACTORS: Record<RiskPreference, number>;
declare const TAKE_PROFIT_FACTORS: Record<RiskPreference, number>;
/**
 * Evaluate bankroll status for a given bet size and risk preference.
 */
export declare function checkBankroll(totalBankroll: number, betSize: number, riskPreference: RiskPreference, consecutiveLosses: number, winProbability: number): BankrollStatus;
/**
 * Simplified risk of ruin.
 *
 * Uses the probability of extending the current loss streak to wipe out
 * the bankroll. A more precise calculation would use full Kelly / Gambler's
 * ruin, but this approximation gives safe guidance.
 *
 *   P(lose N more in a row where N * betSize >= bankroll)
 *
 * Where N = bankroll / betSize (the number of bets needed to bust).
 */
export declare function calculateRiskOfRuin(bankroll: number, betSize: number, winProbability: number, consecutiveLosses: number): number;
/**
 * Check if bet size triggers an overbet condition.
 */
export declare function checkOverbet(betSize: number, bankroll: number): {
    isOverbet: boolean;
    level: "none" | "warning" | "severe" | "critical";
    message?: string;
};
/**
 * Calculate stop-loss threshold based on risk preference.
 */
export declare function calculateStopLoss(bankroll: number, riskPreference: RiskPreference): number;
/**
 * Calculate take-profit threshold based on risk preference.
 */
export declare function calculateTakeProfit(bankroll: number, riskPreference: RiskPreference): number;
/**
 * Determine if a session should stop based on consecutive losses.
 */
export declare function shouldStopSession(consecutiveLosses: number, riskPreference: RiskPreference, maxLoss?: number, totalLoss?: number): {
    stop: boolean;
    reason?: string;
};
/**
 * Get recommended max bet size for a given bankroll and risk preference.
 */
export declare function getRecommendedMaxBet(bankroll: number, riskPreference: RiskPreference): number;
export { STOP_LOSS_FACTORS, TAKE_PROFIT_FACTORS, CONSECUTIVE_LOSS_LIMITS, EXPOSURE_LIMITS };
//# sourceMappingURL=bankroll.d.ts.map