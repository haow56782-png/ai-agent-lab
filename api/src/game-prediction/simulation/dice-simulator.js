/** ============================================================
 *  Dice Simulator — Monte Carlo round simulator
 *
 *  Reuses dice domain probability: each face = 1/6 ≈ 0.1667.
 *  ============================================================ */
import { parseDiceInput, calculateProbability } from "../domains/dice.js";
const HOUSE_EDGE = 0.027;
const FACE_COUNT = 6;
export function getWinProbability(input) {
    const target = input.targetNumber ?? 3;
    const parsed = parseDiceInput({ gameType: "DICE", targetNumber: target });
    return calculateProbability(parsed, false);
}
export function getPayoutMultiplier(_input) {
    // Standard dice payout: FACE_COUNT * (1 - HOUSE_EDGE)
    return FACE_COUNT * (1 - HOUSE_EDGE);
}
export function simulateRound(rng, input) {
    const prob = getWinProbability(input);
    return rng() < prob;
}
//# sourceMappingURL=dice-simulator.js.map