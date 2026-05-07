/** Test helpers: produce domain signals for testing */

import type { Signal } from "../../src/game-prediction/domains/types.js";

export function diceSignal(overrides: Partial<Signal> = {}): Signal {
  return {
    gameType: "DICE",
    recommendation: "SKIP",
    confidence: 0.97,
    reasoning: "Single-number dice probability is 16.7%, below break-even threshold.",
    riskLevel: "LOW",
    probability: 1 / 6,
    expectedValue: -0.17,
    assumptions: ["Fair 6-sided die", "House edge 2.7%"],
    disclaimers: ["Dice outcomes are independent."],
    riskWarning: "Low probability and negative expected value.",
    explanation: "Each face has 1/6 chance.",
    ...overrides,
  };
}

export function crashSignal(overrides: Partial<Signal> = {}): Signal {
  return {
    gameType: "CRASH",
    recommendation: "SKIP",
    confidence: 0.75,
    reasoning: "Probability of reaching 2.0x is 48.5%. Negative expected value.",
    riskLevel: "HIGH",
    probability: 0.485,
    expectedValue: -0.03,
    assumptions: ["House edge 3%"],
    disclaimers: ["Crash games have high variance."],
    riskWarning: "High-volatility game with 48.5% success probability.",
    explanation: "Crash prediction for 2.0x target.",
    ...overrides,
  };
}

export function minesSignal(overrides: Partial<Signal> = {}): Signal {
  return {
    gameType: "MINES",
    recommendation: "CAUTION",
    confidence: 0.97,
    reasoning: "Survival probability is 49.6%. Combinatorial math is favorable.",
    riskLevel: "HIGH",
    probability: 1140 / 2300, // ~0.496 for 5 mines, 3 picks
    assumptions: ["5x5 grid, 5 mines"],
    disclaimers: ["Each pick is independent."],
    riskWarning: "49.6% survival probability with 5 mines.",
    explanation: "Mines prediction for 5x5 grid with 5 mines.",
    ...overrides,
  };
}
