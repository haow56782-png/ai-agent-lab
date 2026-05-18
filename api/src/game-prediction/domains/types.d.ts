/** ============================================================
 *  Game Prediction — Shared domain types for Dice/Crash/Mines
 *  ============================================================ */
export type GameType = "DICE" | "CRASH" | "MINES";
export type Recommendation = "BET" | "SKIP" | "CAUTION";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "EXTREME";
export interface DiceInput {
    gameType: "DICE";
    targetNumber: number;
    betAmount?: number;
    history?: number[];
}
export interface CrashInput {
    gameType: "CRASH";
    targetMultiplier: number;
    previousCrashPoints?: number[];
}
export interface MinesInput {
    gameType: "MINES";
    gridSize?: number;
    minesCount: number;
    picksCount: number;
}
export type GameInput = DiceInput | CrashInput | MinesInput;
export interface Signal {
    gameType: GameType;
    recommendation: Recommendation;
    confidence: number;
    reasoning: string;
    riskLevel: RiskLevel;
    probability: number;
    expectedValue?: number;
    assumptions: string[];
    disclaimers: string[];
    riskWarning: string;
    explanation: string;
}
export interface RiskProfile {
    gameType: GameType;
    rtp: number;
    volatility: "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";
    houseEdge: number;
    maxExposure: number;
    description: string;
}
export declare function combinations(n: number, k: number): number;
//# sourceMappingURL=types.d.ts.map