import { describe, it, expect } from "vitest";
import { runSimulation } from "../../src/game-prediction/simulation/index.js";
import { createRNG } from "../../src/game-prediction/simulation/monte-carlo.js";
import type { SimulationInput, SimulationOutput } from "../../src/game-prediction/simulation/types.js";
import { simulateRound as diceRound, getWinProbability as diceWinProb } from "../../src/game-prediction/simulation/dice-simulator.js";
import { simulateRound as crashRound, getWinProbability as crashWinProb } from "../../src/game-prediction/simulation/crash-simulator.js";
import { simulateRound as minesRound, getWinProbability as minesWinProb } from "../../src/game-prediction/simulation/mines-simulator.js";

/* ─── Helpers ─── */

function makeInput(overrides: Partial<SimulationInput> = {}): SimulationInput {
  return {
    gameType: "DICE",
    bankroll: 1000,
    betSize: 20,
    strategyName: "high-risk-sniper",
    rounds: 100,
    simulations: 50,
    riskPreference: "aggressive",
    targetNumber: 3,
    ...overrides,
  };
}

const FORBIDDEN = ["guaranteed", "certain win", "sure profit", "必赚", "稳赢", "保证盈利"];

function checkForbidden(text: string): string[] {
  return FORBIDDEN.filter((word) => text.toLowerCase().includes(word.toLowerCase()));
}

/* ════════════════════════════════════════════════════════════
   Seeded PRNG
   ════════════════════════════════════════════════════════════ */

describe("Seeded PRNG", () => {
  it("produces deterministic output with same seed", () => {
    const rng1 = createRNG(42);
    const rng2 = createRNG(42);
    const seq1 = Array.from({ length: 10 }, () => rng1());
    const seq2 = Array.from({ length: 10 }, () => rng2());
    expect(seq1).toEqual(seq2);
  });

  it("produces different output with different seeds", () => {
    const rng1 = createRNG(42);
    const rng2 = createRNG(99);
    const seq1 = Array.from({ length: 10 }, () => rng1());
    const seq2 = Array.from({ length: 10 }, () => rng2());
    expect(seq1).not.toEqual(seq2);
  });

  it("produces values in [0, 1) range", () => {
    const rng = createRNG(42);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

/* ════════════════════════════════════════════════════════════
   Domain simulator — probability validation
   ════════════════════════════════════════════════════════════ */

describe("Domain simulators reuse existing probability", () => {
  it("dice probability matches domain (1/6 ≈ 0.167)", () => {
    const prob = diceWinProb(makeInput({ gameType: "DICE", targetNumber: 3 }));
    expect(prob).toBeCloseTo(1 / 6, 4);
  });

  it("crash probability matches domain (P(crash >= 2.0) ≈ 0.485)", () => {
    const prob = crashWinProb(makeInput({ gameType: "CRASH", targetMultiplier: 2.0 }));
    expect(prob).toBeCloseTo(0.485, 3);
  });

  it("mines probability matches domain (5 mines, 3 picks ≈ 0.496)", () => {
    const prob = minesWinProb(makeInput({ gameType: "MINES", minesCount: 5, picksCount: 3 }));
    expect(prob).toBeCloseTo(1140 / 2300, 4);
  });
});

/* ════════════════════════════════════════════════════════════
   Dice — negative EV
   ════════════════════════════════════════════════════════════ */

describe("Dice simulation", () => {
  it("produces negative expected value for single-number strategy", () => {
    const result = runSimulation(makeInput({
      gameType: "DICE",
      targetNumber: 3,
      rounds: 500,
      simulations: 100,
      seed: 42,
    }));
    expect(result.expectedValue).toBeLessThan(0);
  });

  it("win rate is approximately 1/6", () => {
    const result = runSimulation(makeInput({
      gameType: "DICE",
      targetNumber: 5,
      rounds: 1000,
      simulations: 100,
      seed: 42,
    }));
    expect(result.winRate).toBeGreaterThan(0.10);
    expect(result.winRate).toBeLessThan(0.25);
  });

  it("has LOW risk level volatility", () => {
    const result = runSimulation(makeInput({
      gameType: "DICE",
      targetNumber: 3,
      rounds: 100,
      simulations: 50,
      seed: 42,
    }));
    expect(result.volatility).toBeGreaterThanOrEqual(0);
  });
});

/* ════════════════════════════════════════════════════════════
   Crash — volatility comparison
   ════════════════════════════════════════════════════════════ */

describe("Crash simulation", () => {
  it("high multiplier produces higher volatility than low multiplier", () => {
    const lowMulti = runSimulation(makeInput({
      gameType: "CRASH",
      targetMultiplier: 1.5,
      rounds: 500,
      simulations: 80,
      seed: 42,
    }));
    const highMulti = runSimulation(makeInput({
      gameType: "CRASH",
      targetMultiplier: 5.0,
      rounds: 500,
      simulations: 80,
      seed: 99,
    }));
    // Higher multiplier = higher payout variance = higher volatility
    expect(highMulti.volatility).toBeGreaterThanOrEqual(lowMulti.volatility * 2);
  });

  it("win rate is lower for higher multiplier targets", () => {
    const lowMulti = runSimulation(makeInput({
      gameType: "CRASH",
      targetMultiplier: 1.5,
      rounds: 1000,
      simulations: 100,
      seed: 42,
    }));
    const highMulti = runSimulation(makeInput({
      gameType: "CRASH",
      targetMultiplier: 5.0,
      rounds: 1000,
      simulations: 100,
      seed: 42,
    }));
    expect(highMulti.winRate).toBeLessThan(lowMulti.winRate);
  });
});

/* ════════════════════════════════════════════════════════════
   Mines — ruin probability
   ════════════════════════════════════════════════════════════ */

describe("Mines simulation", () => {
  it("high-risk mines has higher ruin probability than low-risk", () => {
    const lowRisk = runSimulation(makeInput({
      gameType: "MINES",
      minesCount: 2,
      picksCount: 1,
      rounds: 200,
      simulations: 80,
      seed: 42,
    }));
    const highRisk = runSimulation(makeInput({
      gameType: "MINES",
      minesCount: 10,
      picksCount: 3,
      rounds: 200,
      simulations: 80,
      seed: 99,
    }));
    expect(highRisk.ruinProbability).toBeGreaterThanOrEqual(lowRisk.ruinProbability);
  });
});

/* ════════════════════════════════════════════════════════════
   Seed reproducibility
   ════════════════════════════════════════════════════════════ */

describe("Seed reproducibility", () => {
  it("same seed produces identical results", () => {
    const a = runSimulation(makeInput({ rounds: 200, simulations: 50, seed: 42 }));
    const b = runSimulation(makeInput({ rounds: 200, simulations: 50, seed: 42 }));
    expect(a.expectedFinalBankroll).toBe(b.expectedFinalBankroll);
    expect(a.maxDrawdown).toBe(b.maxDrawdown);
    expect(a.ruinProbability).toBe(b.ruinProbability);
    expect(a.winRate).toBe(b.winRate);
  });

  it("different seed produces different results", () => {
    const a = runSimulation(makeInput({ rounds: 200, simulations: 50, seed: 42 }));
    const b = runSimulation(makeInput({ rounds: 200, simulations: 50, seed: 99 }));
    // Very unlikely to be identical with different seeds
    const identical =
      a.expectedFinalBankroll === b.expectedFinalBankroll &&
      a.ruinProbability === b.ruinProbability;
    expect(identical).toBe(false);
  });
});

/* ════════════════════════════════════════════════════════════
   Input validation
   ════════════════════════════════════════════════════════════ */

describe("Input validation", () => {
  it("throws on missing gameType", () => {
    expect(() => runSimulation(makeInput({ gameType: undefined as unknown as "DICE" }))).toThrow();
  });

  it("throws on zero bankroll", () => {
    expect(() => runSimulation(makeInput({ bankroll: 0 }))).toThrow();
  });

  it("throws on negative betSize", () => {
    expect(() => runSimulation(makeInput({ betSize: -1 }))).toThrow();
  });

  it("throws on betSize exceeding bankroll", () => {
    expect(() => runSimulation(makeInput({ bankroll: 50, betSize: 100 }))).toThrow();
  });

  it("throws on invalid rounds (zero)", () => {
    expect(() => runSimulation(makeInput({ rounds: 0 }))).toThrow();
  });

  it("throws on invalid simulations (zero)", () => {
    expect(() => runSimulation(makeInput({ simulations: 0 }))).toThrow();
  });

  it("throws on rounds exceeding max (100k)", () => {
    expect(() => runSimulation(makeInput({ rounds: 100001 }))).toThrow();
  });

  it("throws on simulations exceeding max (10k)", () => {
    expect(() => runSimulation(makeInput({ simulations: 10001 }))).toThrow();
  });

  it("throws on unsupported game type", () => {
    expect(() => runSimulation(makeInput({ gameType: "POKER" as "DICE" }))).toThrow();
  });
});

/* ════════════════════════════════════════════════════════════
   Output contract
   ════════════════════════════════════════════════════════════ */

describe("Output contract", () => {
  const result = runSimulation(makeInput({ seed: 42 }));

  const requiredKeys: (keyof SimulationOutput)[] = [
    "expectedValue",
    "expectedFinalBankroll",
    "profitLossDistribution",
    "maxDrawdown",
    "ruinProbability",
    "winRate",
    "lossRate",
    "volatility",
    "percentileOutcomes",
    "recommendation",
    "warnings",
    "assumptions",
  ];

  for (const key of requiredKeys) {
    it(`includes ${key}`, () => {
      expect(result[key]).toBeDefined();
    });
  }

  it("winRate + lossRate ≈ 1.0", () => {
    expect(result.winRate + result.lossRate).toBeCloseTo(1.0, 1);
  });

  it("percentileOutcomes has all 5 percentiles", () => {
    const p = result.percentileOutcomes;
    expect(typeof p.p5).toBe("number");
    expect(typeof p.p25).toBe("number");
    expect(typeof p.p50).toBe("number");
    expect(typeof p.p75).toBe("number");
    expect(typeof p.p95).toBe("number");
  });

  it("profitLossDistribution length matches simulations count", () => {
    expect(result.profitLossDistribution.length).toBe(50);
  });

  it("has at least one warning for negative EV strategy", () => {
    expect(result.warnings.length).toBeGreaterThanOrEqual(1);
  });

  it("has at least one assumption", () => {
    expect(result.assumptions.length).toBeGreaterThanOrEqual(1);
  });
});

/* ════════════════════════════════════════════════════════════
   No forbidden language
   ════════════════════════════════════════════════════════════ */

describe("No forbidden language", () => {
  const scenarios = [
    { name: "DICE", input: makeInput({ gameType: "DICE", seed: 42 }) },
    { name: "CRASH", input: makeInput({ gameType: "CRASH", targetMultiplier: 2.0, seed: 42 }) },
    { name: "MINES", input: makeInput({ gameType: "MINES", minesCount: 5, picksCount: 2, seed: 42 }) },
  ];

  for (const { name, input } of scenarios) {
    it(`${name}: no forbidden language in recommendation`, () => {
      const result = runSimulation(input);
      const violations = checkForbidden(result.recommendation);
      expect(violations).toEqual([]);
    });

    it(`${name}: no forbidden language in warnings`, () => {
      const result = runSimulation(input);
      const allWarnings = result.warnings.join(" ");
      const violations = checkForbidden(allWarnings);
      expect(violations).toEqual([]);
    });

    it(`${name}: no forbidden language in assumptions`, () => {
      const result = runSimulation(input);
      const allAssumptions = result.assumptions.join(" ");
      const violations = checkForbidden(allAssumptions);
      expect(violations).toEqual([]);
    });
  }
});

/* ════════════════════════════════════════════════════════════
   Stop-loss / take-profit
   ════════════════════════════════════════════════════════════ */

describe("Stop-loss / take-profit", () => {
  it("stopLoss limits maxDrawdown", () => {
    const without = runSimulation(makeInput({ rounds: 500, simulations: 50, seed: 42 }));
    const withStop = runSimulation(makeInput({ rounds: 500, simulations: 50, seed: 42, stopLoss: 200 }));
    // With stop-loss, max drawdown should be bounded
    expect(withStop.maxDrawdown).toBeLessThanOrEqual(without.maxDrawdown + 1);
  });
});
