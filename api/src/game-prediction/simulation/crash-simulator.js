/** ============================================================
 *  Crash Simulator — Monte Carlo round simulator
 *
 *  Reuses crash domain probability: P(crash >= M) = (1-he) / M.
 *  Payout multiplier = targetMultiplier (the crash point).
 *  ============================================================ */
import { calculateProbability } from "../domains/crash.js";
export function getWinProbability(input) {
    const multiplier = input.targetMultiplier ?? 2.0;
    return calculateProbability(multiplier);
}
export function getPayoutMultiplier(input) {
    // For crash, the payout IS the target multiplier
    return input.targetMultiplier ?? 2.0;
}
export function simulateRound(rng, input) {
    const prob = getWinProbability(input);
    return rng() < prob;
}
//# sourceMappingURL=crash-simulator.js.map