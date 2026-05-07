/** ============================================================
 *  Simulation Engine — Main entry
 *
 *  Validates input, selects the right domain simulator,
 *  runs Monte Carlo simulation, and returns aggregated results.
 *
 *  Can be called by the Decision Engine for additional context.
 *  ============================================================ */

import type { SimulationInput, SimulationOutput } from "./types.js";
import { createRNG, runMonteCarlo, aggregateResults, type RoundSimulator } from "./monte-carlo.js";
import {
  getWinProbability as diceProb,
  getPayoutMultiplier as dicePayout,
  simulateRound as diceRound,
} from "./dice-simulator.js";
import {
  getWinProbability as crashProb,
  getPayoutMultiplier as crashPayout,
  simulateRound as crashRound,
} from "./crash-simulator.js";
import {
  getWinProbability as minesProb,
  getPayoutMultiplier as minesPayout,
  simulateRound as minesRound,
} from "./mines-simulator.js";

/**
 * Run a full Monte Carlo simulation for the given game/strategy.
 */
export function runSimulation(input: SimulationInput): SimulationOutput {
  validateInput(input);

  const rng = createRNG(input.seed);
  const { simulateRound, payoutMultiplier } = getGameConfig(input);

  const raw = runMonteCarlo({
    rounds: input.rounds,
    simulations: input.simulations,
    rng,
    simulateRound: () => simulateRound(rng, input),
    initialBankroll: input.bankroll,
    betSize: input.betSize,
    payoutMultiplier,
    stopLoss: input.stopLoss,
    takeProfit: input.takeProfit,
  });

  return aggregateResults(raw, input, payoutMultiplier);
}

/* ─── Validation ─── */

function validateInput(input: SimulationInput): void {
  if (!input.gameType) throw new Error("gameType is required");
  if (input.bankroll == null || input.bankroll <= 0) throw new Error("bankroll must be positive");
  if (input.betSize == null || input.betSize <= 0) throw new Error("betSize must be positive");
  if (input.betSize > input.bankroll) throw new Error("betSize cannot exceed bankroll");
  if (input.rounds == null || !Number.isInteger(input.rounds) || input.rounds < 1) {
    throw new Error("rounds must be a positive integer");
  }
  if (input.rounds > 100000) throw new Error("rounds cannot exceed 100,000");
  if (input.simulations == null || !Number.isInteger(input.simulations) || input.simulations < 1) {
    throw new Error("simulations must be a positive integer");
  }
  if (input.simulations > 10000) throw new Error("simulations cannot exceed 10,000");
  if (!["DICE", "CRASH", "MINES"].includes(input.gameType)) {
    throw new Error(`Unsupported game type: ${input.gameType}. Supported: DICE, CRASH, MINES`);
  }
}

/* ─── Game config router ─── */

interface GameConfig {
  simulateRound: (rng: () => number, input: SimulationInput) => boolean;
  payoutMultiplier: number;
}

function getGameConfig(input: SimulationInput): GameConfig {
  switch (input.gameType) {
    case "DICE":
      return {
        simulateRound: diceRound,
        payoutMultiplier: dicePayout(input),
      };
    case "CRASH":
      return {
        simulateRound: crashRound,
        payoutMultiplier: crashPayout(input),
      };
    case "MINES":
      return {
        simulateRound: minesRound,
        payoutMultiplier: minesPayout(input),
      };
    default:
      throw new Error(`Unsupported game type: ${input.gameType}`);
  }
}
