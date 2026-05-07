/** ============================================================
 *  Simulation Engine — Types
 *  ============================================================ */

import type { GameType, RiskLevel } from "../domains/types.js";
import type { RiskPreference } from "../decision-engine/types.js";

export interface SimulationInput {
  gameType: GameType;
  bankroll: number;
  betSize: number;
  strategyName: string;
  rounds: number;          // rounds per simulation
  simulations: number;     // number of Monte Carlo runs
  riskPreference: RiskPreference;
  stopLoss?: number;
  takeProfit?: number;
  seed?: number;
  /* Game-specific parameters (forwarded to domain probability) */
  targetNumber?: number;       // Dice 1–6
  targetMultiplier?: number;   // Crash multiplier target
  minesCount?: number;         // Mines mine count
  picksCount?: number;         // Mines planned picks
  gridSize?: number;           // Mines grid dimension (default 5)
}

export interface PercentileOutcomes {
  p5: number;
  p25: number;
  p50: number;
  p75: number;
  p95: number;
}

export interface SimulationOutput {
  expectedValue: number;              // mean net EV per round (as fraction of bet)
  expectedFinalBankroll: number;      // mean ending bankroll across simulations
  profitLossDistribution: number[];   // array of PL values (bankroll - initial) per sim
  maxDrawdown: number;                // maximum peak-to-trough drop across all sims
  ruinProbability: number;            // fraction of sims where bankroll hit 0
  winRate: number;                    // fraction of winning rounds
  lossRate: number;                   // fraction of losing rounds
  volatility: number;                 // std dev of final bankrolls
  percentileOutcomes: PercentileOutcomes;
  recommendation: string;
  warnings: string[];
  assumptions: string[];
}
