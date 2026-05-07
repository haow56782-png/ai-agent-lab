/** ============================================================
 *  Dice Strategies
 *
 *  3 strategies for Dice, mapped to risk preferences:
 *    - capital-preservation  (conservative)
 *    - low-volatility-farming (balanced)
 *    - high-risk-sniper      (aggressive)
 *  ============================================================ */

import type { Strategy, StrategyResult } from "./types.js";
import type { DecisionInput } from "../decision-engine/types.js";
import type { Signal } from "../domains/types.js";

/* ─── Strategy: capital-preservation ─── */

const capitalPreservation: Strategy = {
  name: "capital-preservation",
  gameType: "DICE",
  description: "Minimal risk. Only plays when probability exceeds 25%. Uses small bet sizes (1% of bankroll).",
  riskPreference: "conservative",

  evaluate(_input: DecisionInput, signal: Signal): StrategyResult {
    const probability = signal.probability;
    const baseFraction = 0.01;

    // Single-number dice is always ~16.7% — below conservative threshold
    if (probability < 0.20 || signal.recommendation === "SKIP") {
      return {
        action: "SKIP",
        confidence: 0.85,
        recommendedBetSizeFraction: 0,
        reasoning: `Dice probability (${(probability * 100).toFixed(1)}%) is below the conservative threshold. Single-number bets have negative expected value.`,
        warnings: ["Single-number dice probability is too low for conservative play."],
      };
    }

    return {
      action: "PLAY",
      confidence: 0.80,
      recommendedBetSizeFraction: baseFraction,
      reasoning: `Playing with ${(baseFraction * 100).toFixed(0)}% bankroll allocation. Probability (${(probability * 100).toFixed(1)}%) meets conservative threshold.`,
      warnings: [],
    };
  },
};

/* ─── Strategy: low-volatility-farming ─── */

const lowVolatilityFarming: Strategy = {
  name: "low-volatility-farming",
  gameType: "DICE",
  description: "Balanced risk. Spreads bets for consistent small wins. Uses 3% bankroll per bet.",
  riskPreference: "balanced",

  evaluate(_input: DecisionInput, signal: Signal): StrategyResult {
    const probability = signal.probability;
    const baseFraction = 0.03;

    if (probability < 0.10) {
      return {
        action: "SKIP",
        confidence: 0.80,
        recommendedBetSizeFraction: 0,
        reasoning: `Probability (${(probability * 100).toFixed(1)}%) is too low even for a balanced approach.`,
        warnings: [],
      };
    }

    if (probability < 0.20 && signal.recommendation === "SKIP") {
      return {
        action: "SKIP",
        confidence: 0.70,
        recommendedBetSizeFraction: 0,
        reasoning: `Single-number dice at ${(probability * 100).toFixed(1)}% probability — recommend spreading across multiple numbers for better odds.`,
        warnings: ["Consider a 2-3 number spread instead of single-number bet."],
      };
    }

    return {
      action: "PLAY",
      confidence: 0.75,
      recommendedBetSizeFraction: baseFraction,
      reasoning: `Playing with ${(baseFraction * 100).toFixed(0)}% bankroll. Acceptable risk for balanced play at ${(probability * 100).toFixed(1)}% probability.`,
      warnings: ["Dice has negative expected value; long-term losses are expected."],
    };
  },
};

/* ─── Strategy: high-risk-sniper ─── */

const highRiskSniper: Strategy = {
  name: "high-risk-sniper",
  gameType: "DICE",
  description: "Aggressive single-number betting. Accepts negative EV for high-payout potential. Uses 6% bankroll.",
  riskPreference: "aggressive",

  evaluate(_input: DecisionInput, signal: Signal): StrategyResult {
    const baseFraction = 0.06;

    // Always PLAY for aggressive, but with strong warning
    const warnings: string[] = [
      "High-risk strategy: single-number dice has negative expected value.",
      "This bet has a ~16.7% success probability. Losses are more likely than wins.",
      "Only bet what you can afford to lose.",
    ];

    return {
      action: "PLAY",
      confidence: 0.60,
      recommendedBetSizeFraction: baseFraction,
      reasoning: `High-risk sniper: accepting low probability (${(signal.probability * 100).toFixed(1)}%) for potential high payout. ${(baseFraction * 100).toFixed(0)}% bankroll allocation.`,
      warnings,
    };
  },
};

/* ─── Registry ─── */

export const diceStrategies: Record<string, Strategy> = {
  "capital-preservation": capitalPreservation,
  "low-volatility-farming": lowVolatilityFarming,
  "high-risk-sniper": highRiskSniper,
};
