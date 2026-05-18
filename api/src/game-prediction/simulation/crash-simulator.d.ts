/** ============================================================
 *  Crash Simulator — Monte Carlo round simulator
 *
 *  Reuses crash domain probability: P(crash >= M) = (1-he) / M.
 *  Payout multiplier = targetMultiplier (the crash point).
 *  ============================================================ */
import type { SimulationInput } from "./types.js";
export declare function getWinProbability(input: SimulationInput): number;
export declare function getPayoutMultiplier(input: SimulationInput): number;
export declare function simulateRound(rng: () => number, input: SimulationInput): boolean;
//# sourceMappingURL=crash-simulator.d.ts.map