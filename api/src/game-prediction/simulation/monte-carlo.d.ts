/** ============================================================
 *  Simulation Engine — Seeded PRNG + Monte Carlo runner
 *  ============================================================ */
import type { SimulationInput, SimulationOutput } from "./types.js";
export declare function createRNG(seed?: number): () => number;
export interface RoundSimulator {
    /** Return true if the round is a win, false if loss */
    (rng: () => number): boolean;
}
export interface MonteCarloParams {
    rounds: number;
    simulations: number;
    rng: () => number;
    simulateRound: RoundSimulator;
    initialBankroll: number;
    betSize: number;
    payoutMultiplier: number;
    stopLoss?: number;
    takeProfit?: number;
}
export declare function runMonteCarlo(params: MonteCarloParams): {
    finalBankrolls: number[];
    drawdowns: number[];
    totalWins: number;
    totalRounds: number;
    ruinCount: number;
};
export declare function aggregateResults(raw: {
    finalBankrolls: number[];
    drawdowns: number[];
    totalWins: number;
    totalRounds: number;
    ruinCount: number;
}, input: SimulationInput, payoutMultiplier: number): SimulationOutput;
//# sourceMappingURL=monte-carlo.d.ts.map