/** ============================================================
 *  Dice — Fair 6-sided dice prediction
 *
 *  Pure probability model. Each face has exactly 1/6 ≈ 16.67%
 *  chance.  All outcomes are independent — past results do not
 *  affect future probability.
 *  ============================================================ */
import type { DiceInput, Signal, RiskProfile } from "./types.js";
export declare function getRiskProfile(): RiskProfile;
export interface ValidatedDiceInput {
    targetNumber: number;
    betAmount: number;
    history: number[];
}
export declare function parseDiceInput(input: DiceInput): ValidatedDiceInput;
export declare function calculateProbability(_parsed: ValidatedDiceInput, useHistory: boolean): number;
export declare function calculateConfidence(useHistory: boolean, historyLength: number): number;
export declare function generateRecommendation(probability: number, _confidence: number): {
    recommendation: "BET" | "SKIP" | "CAUTION";
    riskLevel: "LOW" | "MEDIUM" | "HIGH" | "EXTREME";
};
export declare function getExplanation(input: ValidatedDiceInput, probability: number, confidence: number, useHistory: boolean): string;
export declare function generateSignal(input: DiceInput): Signal;
//# sourceMappingURL=dice.d.ts.map