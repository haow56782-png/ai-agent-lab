/** ============================================================
 *  Decision Engine — Policy rules
 *
 *  Strategy selection and decision policy that overrides or
 *  adjusts strategy recommendations based on risk constraints.
 *  ============================================================ */
import type { DecisionInput, DecisionAction, RiskPreference } from "./types.js";
import type { GameType } from "../domains/types.js";
import type { StrategyResult } from "../strategies/types.js";
import type { RiskAssessment } from "../risk-engine/types.js";
/**
 * Select the strategy name for a given game type and risk preference.
 */
export declare function selectStrategyName(gameType: GameType, riskPreference: RiskPreference): string;
/**
 * Get the strategy object by game type and strategy name.
 */
export declare function getStrategy(gameType: string, strategyName: string): import("../strategies/types.js").Strategy;
export interface PolicyResult {
    action: DecisionAction;
    recommendedBetSize: number;
    confidence: number;
    reasoning: string;
    warnings: string[];
}
/**
 * Apply decision policy rules on top of strategy + risk assessment.
 *
 * Rules:
 *  1. If risk says stop → STOP_SESSION
 *  2. If domain SKIP + strategy PLAY → REDUCE_SIZE (unless aggressive)
 *  3. If overbet severe → REDUCE_SIZE
 *  4. If risk of ruin high → STOP_SESSION
 *  5. Default → strategy recommendation
 */
export declare function applyPolicy(input: DecisionInput, strategyResult: StrategyResult, riskAssessment: RiskAssessment, strategyName: string): PolicyResult;
export declare function getDefaultAssumptions(): string[];
//# sourceMappingURL=decision-policy.d.ts.map