/** ============================================================
 *  Mines Simulator — Monte Carlo round simulator
 *
 *  Reuses mines domain probability: survival = C(25-M, N) / C(25, N).
 *  Each round = attempt N picks; win = survive all picks.
 *  ============================================================ */

import { parseMinesInput, calculateProbability } from "../domains/mines.js";
import type { SimulationInput } from "./types.js";

const HOUSE_EDGE = 0.05; // 5% typical for mines

export function getWinProbability(input: SimulationInput): number {
  const minesCount = input.minesCount ?? 5;
  const picksCount = input.picksCount ?? 2;
  const gridSize = input.gridSize ?? 5;
  const parsed = parseMinesInput({ gameType: "MINES", gridSize, minesCount, picksCount });
  return calculateProbability(parsed);
}

export function getPayoutMultiplier(input: SimulationInput): number {
  const prob = getWinProbability(input);
  if (prob <= 0) return 1;
  return (1 / prob) * (1 - HOUSE_EDGE);
}

export function simulateRound(rng: () => number, input: SimulationInput): boolean {
  const prob = getWinProbability(input);
  return rng() < prob;
}
