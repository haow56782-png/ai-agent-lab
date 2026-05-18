/** ============================================================
 *  Simulation Engine — Types
 *  ============================================================ */
import type { GameType } from "../domains/types.js";
import type { RiskPreference } from "../decision-engine/types.js";
export interface SimulationInput {
    gameType: GameType;
    bankroll: number;
    betSize: number;
    strategyName: string;
    rounds: number;
    simulations: number;
    riskPreference: RiskPreference;
    stopLoss?: number;
    takeProfit?: number;
    seed?: number;
    targetNumber?: number;
    targetMultiplier?: number;
    minesCount?: number;
    picksCount?: number;
    gridSize?: number;
}
export interface PercentileOutcomes {
    p5: number;
    p25: number;
    p50: number;
    p75: number;
    p95: number;
}
export interface SimulationOutput {
    expectedValue: number;
    expectedFinalBankroll: number;
    profitLossDistribution: number[];
    maxDrawdown: number;
    ruinProbability: number;
    winRate: number;
    lossRate: number;
    volatility: number;
    percentileOutcomes: PercentileOutcomes;
    recommendation: string;
    warnings: string[];
    assumptions: string[];
}
//# sourceMappingURL=types.d.ts.map