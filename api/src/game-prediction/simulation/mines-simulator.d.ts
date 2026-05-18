/** ============================================================
 *  Mines Simulator — Monte Carlo round simulator
 *
 *  Reuses mines domain probability: survival = C(25-M, N) / C(25, N).
 *  Each round = attempt N picks; win = survive all picks.
 *  ============================================================ */
import type { SimulationInput } from "./types.js";
export declare function getWinProbability(input: SimulationInput): number;
export declare function getPayoutMultiplier(input: SimulationInput): number;
export declare function simulateRound(rng: () => number, input: SimulationInput): boolean;
//# sourceMappingURL=mines-simulator.d.ts.map