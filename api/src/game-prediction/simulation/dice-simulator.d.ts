/** ============================================================
 *  Dice Simulator — Monte Carlo round simulator
 *
 *  Reuses dice domain probability: each face = 1/6 ≈ 0.1667.
 *  ============================================================ */
import type { SimulationInput } from "./types.js";
export declare function getWinProbability(input: SimulationInput): number;
export declare function getPayoutMultiplier(_input: SimulationInput): number;
export declare function simulateRound(rng: () => number, input: SimulationInput): boolean;
//# sourceMappingURL=dice-simulator.d.ts.map