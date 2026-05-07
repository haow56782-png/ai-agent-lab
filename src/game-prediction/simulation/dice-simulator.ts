/** ============================================================
 *  Dice Simulator — Monte Carlo round simulator
 *
 *  Reuses dice domain probability: each face = 1/6 ≈ 0.1667.
 *  ============================================================ */

import { parseDiceInput, calculateProbability } from "../domains/dice.js";
import type { DiceInput } from "../domains/types.js";
import type { SimulationInput } from "./types.js";

const HOUSE_EDGE = 0.027;
const FACE_COUNT = 6;

export function getWinProbability(input: SimulationInput): number {
  const target = input.targetNumber ?? 3;
  const parsed = parseDiceInput({ gameType: "DICE", targetNumber: target });
  return calculateProbability(parsed, false);
}

export function getPayoutMultiplier(_input: SimulationInput): number {
  // Standard dice payout: FACE_COUNT * (1 - HOUSE_EDGE)
  return FACE_COUNT * (1 - HOUSE_EDGE);
}

export function simulateRound(rng: () => number, input: SimulationInput): boolean {
  const prob = getWinProbability(input);
  return rng() < prob;
}
