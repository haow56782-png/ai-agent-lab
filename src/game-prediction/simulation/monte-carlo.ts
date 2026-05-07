/** ============================================================
 *  Simulation Engine — Seeded PRNG + Monte Carlo runner
 *  ============================================================ */

import type { SimulationInput, SimulationOutput, PercentileOutcomes } from "./types.js";

/* ─── Seeded PRNG (mulberry32) ─── */

export function createRNG(seed?: number): () => number {
  let s = (seed ?? Date.now()) | 0;
  return function mulberry32(): number {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ─── Round simulator signature ─── */

export interface RoundSimulator {
  /** Return true if the round is a win, false if loss */
  (rng: () => number): boolean;
}

/* ─── Statistics helpers ─── */

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdDev(values: number[], avg: number): number {
  if (values.length < 2) return 0;
  const sqDiffs = values.map((v) => (v - avg) ** 2);
  return Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / (values.length - 1));
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.ceil(p / 100 * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

function max(values: number[]): number {
  return values.reduce((a, b) => (a > b ? a : b), -Infinity);
}

/* ─── Monte Carlo runner ─── */

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

export function runMonteCarlo(params: MonteCarloParams): {
  finalBankrolls: number[];
  drawdowns: number[];
  totalWins: number;
  totalRounds: number;
  ruinCount: number;
} {
  const finalBankrolls: number[] = [];
  const drawdowns: number[] = [];
  let totalWins = 0;
  let totalRounds = 0;
  let ruinCount = 0;

  for (let sim = 0; sim < params.simulations; sim++) {
    let bankroll = params.initialBankroll;
    let peak = bankroll;
    let maxDD = 0;
    let wins = 0;
    let rounds = 0;

    for (let r = 0; r < params.rounds; r++) {
      if (bankroll <= 0) break;

      const actualBet = Math.min(params.betSize, bankroll);
      const won = params.simulateRound(params.rng);
      rounds++;

      if (won) {
        bankroll += actualBet * (params.payoutMultiplier - 1);
        wins++;
      } else {
        bankroll -= actualBet;
      }

      peak = Math.max(peak, bankroll);
      maxDD = Math.max(maxDD, peak - bankroll);

      // Check session limits
      const loss = params.initialBankroll - bankroll;
      const profit = bankroll - params.initialBankroll;
      if (params.stopLoss != null && loss >= params.stopLoss) break;
      if (params.takeProfit != null && profit >= params.takeProfit) break;
    }

    finalBankrolls.push(bankroll);
    drawdowns.push(maxDD);
    totalWins += wins;
    totalRounds += rounds;
    if (bankroll <= 0) ruinCount++;
  }

  return { finalBankrolls, drawdowns, totalWins, totalRounds, ruinCount };
}

/* ─── Aggregate results ─── */

export function aggregateResults(
  raw: { finalBankrolls: number[]; drawdowns: number[]; totalWins: number; totalRounds: number; ruinCount: number },
  input: SimulationInput,
  payoutMultiplier: number,
): SimulationOutput {
  const { finalBankrolls, drawdowns, totalWins, totalRounds, ruinCount } = raw;
  const n = finalBankrolls.length;

  const avgFinal = mean(finalBankrolls);
  const sorted = [...finalBankrolls].sort((a, b) => a - b);
  const winRate = totalRounds > 0 ? totalWins / totalRounds : 0;

  // EV per round as fraction of bet
  const avgPL = mean(finalBankrolls.map((fb) => fb - input.bankroll));
  const expectedValue = totalRounds > 0 ? avgPL / (input.betSize * totalRounds / n) : 0;

  const output: SimulationOutput = {
    expectedValue: Math.round(expectedValue * 10000) / 10000,
    expectedFinalBankroll: Math.round(avgFinal * 100) / 100,
    profitLossDistribution: finalBankrolls.map((fb) => Math.round((fb - input.bankroll) * 100) / 100),
    maxDrawdown: Math.round(max(drawdowns) * 100) / 100,
    ruinProbability: Math.round((ruinCount / n) * 10000) / 10000,
    winRate: Math.round(winRate * 10000) / 10000,
    lossRate: Math.round((1 - winRate) * 10000) / 10000,
    volatility: Math.round(stdDev(finalBankrolls, avgFinal) * 100) / 100,
    percentileOutcomes: {
      p5: Math.round(percentile(sorted, 5) * 100) / 100,
      p25: Math.round(percentile(sorted, 25) * 100) / 100,
      p50: Math.round(percentile(sorted, 50) * 100) / 100,
      p75: Math.round(percentile(sorted, 75) * 100) / 100,
      p95: Math.round(percentile(sorted, 95) * 100) / 100,
    },
    recommendation: buildRecommendation(expectedValue, ruinCount / n, max(drawdowns), input.bankroll),
    warnings: buildWarnings(expectedValue, ruinCount / n, max(drawdowns), input.bankroll, winRate),
    assumptions: buildAssumptions(input),
  };

  return output;
}

/* ─── Recommendation / warnings / assumptions ─── */

function buildRecommendation(ev: number, ruinProb: number, maxDD: number, bankroll: number): string {
  if (ruinProb > 0.3) {
    return "High risk of ruin. Reduce bet size or switch to a lower-volatility strategy.";
  }
  if (ev < -0.1) {
    return "Negative expected value exceeds 10% per bet. Long-term losses are highly probable.";
  }
  if (maxDD > bankroll * 0.5) {
    return "Maximum drawdown exceeds 50% of initial bankroll. Set a strict stop-loss.";
  }
  if (ruinProb > 0.05) {
    return "Moderate risk of ruin. Consider reducing bet size for longer session survival.";
  }
  return "Simulation indicates manageable risk within typical bankroll management guidelines.";
}

function buildWarnings(ev: number, ruinProb: number, maxDD: number, bankroll: number, winRate: number): string[] {
  const warnings: string[] = [];
  if (ev < 0) warnings.push(`Negative expected value (${(ev * 100).toFixed(1)}% per bet). Long-term losses expected.`);
  if (ruinProb > 0.1) warnings.push(`High ruin probability (${(ruinProb * 100).toFixed(0)}%). Consider reducing bet size.`);
  if (maxDD > bankroll * 0.4) warnings.push(`Large maximum drawdown (${((maxDD / bankroll) * 100).toFixed(0)}% of bankroll).`);
  if (winRate < 0.2) warnings.push(`Low win rate (${(winRate * 100).toFixed(0)}%). Extended losing streaks are likely.`);
  if (ruinProb > 0.3) warnings.push("Risk of ruin exceeds 30%. Strategy is not sustainable.");
  return warnings;
}

function buildAssumptions(input: SimulationInput): string[] {
  return [
    `Monte Carlo simulation with ${input.simulations} runs of ${input.rounds} rounds each.`,
    "Results are probabilistic projections, not guarantees of future performance.",
    "Assumes consistent bet sizing and no strategy changes during the session.",
    "House edge is factored into payout calculations per game type.",
    "Past simulation results do not guarantee future outcomes.",
  ];
}
