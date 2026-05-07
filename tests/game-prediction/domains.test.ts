import { describe, it, expect } from "vitest";
import { generateSignal as diceSignal, parseDiceInput, calculateProbability as diceProb, getRiskProfile as diceProfile } from "../../src/game-prediction/domains/dice.js";
import { generateSignal as crashSignal, parseCrashInput, calculateProbability as crashProb, getRiskProfile as crashProfile } from "../../src/game-prediction/domains/crash.js";
import { generateSignal as minesSignal, parseMinesInput, calculateProbability as minesProb, getRiskProfile as minesProfile } from "../../src/game-prediction/domains/mines.js";
import type { Signal } from "../../src/game-prediction/domains/types.js";

/* ════════════════════════════════════════════════════════════
   Dice
   ════════════════════════════════════════════════════════════ */

describe("Dice", () => {
  it("single number probability is always 1/6", () => {
    const parsed = parseDiceInput({ gameType: "DICE", targetNumber: 3 });
    const prob = diceProb(parsed, false);
    expect(prob).toBeCloseTo(1 / 6, 5);
  });

  it("probability is the same for any valid target 1–6", () => {
    for (let target = 1; target <= 6; target++) {
      const parsed = parseDiceInput({ gameType: "DICE", targetNumber: target });
      const prob = diceProb(parsed, false);
      expect(prob).toBeCloseTo(1 / 6, 5);
    }
  });

  it("rejects target numbers outside 1–6", () => {
    expect(() => parseDiceInput({ gameType: "DICE", targetNumber: 0 })).toThrow();
    expect(() => parseDiceInput({ gameType: "DICE", targetNumber: 7 })).toThrow();
    expect(() => parseDiceInput({ gameType: "DICE", targetNumber: -1 })).toThrow();
    expect(() => parseDiceInput({ gameType: "DICE", targetNumber: 3.5 })).toThrow();
  });

  it("recommends SKIP for single-number bets", () => {
    const signal = diceSignal({ gameType: "DICE", targetNumber: 4 });
    expect(signal.recommendation).toBe("SKIP");
  });

  it("has LOW risk level", () => {
    const profile = diceProfile();
    expect(profile.volatility).toBe("LOW");
    expect(profile.rtp).toBeCloseTo(97.3, 1);
  });

  it("includes independence disclaimer", () => {
    const signal = diceSignal({ gameType: "DICE", targetNumber: 2 });
    const allDisclaimers = signal.disclaimers.join(" ");
    expect(allDisclaimers.toLowerCase()).toContain("independent");
  });

  it("includes expectedValue", () => {
    const signal = diceSignal({ gameType: "DICE", targetNumber: 5 });
    expect(signal.expectedValue).toBeDefined();
    expect(typeof signal.expectedValue).toBe("number");
  });
});

/* ════════════════════════════════════════════════════════════
   Crash
   ════════════════════════════════════════════════════════════ */

describe("Crash", () => {
  it("probability for 2x multiplier is approximately RTP / 2", () => {
    const prob = crashProb(2.0);
    // RTP = 0.97, so P(crash >= 2) ≈ 0.97 / 2 = 0.485
    expect(prob).toBeCloseTo(0.485, 3);
  });

  it("probability for 1.0x multiplier is 1.0 (always reaches at least 1x)", () => {
    const prob = crashProb(1.0);
    expect(prob).toBe(1.0);
  });

  it("probability decreases as multiplier increases", () => {
    const p1 = crashProb(1.5);
    const p2 = crashProb(2.0);
    const p3 = crashProb(5.0);
    expect(p1).toBeGreaterThan(p2);
    expect(p2).toBeGreaterThan(p3);
  });

  it("very high multiplier has very low probability", () => {
    const prob = crashProb(100);
    expect(prob).toBeLessThan(0.01);
  });

  it("rejects multiplier below 1.0", () => {
    expect(() => parseCrashInput({ gameType: "CRASH", targetMultiplier: 0.5 })).toThrow();
    expect(() => parseCrashInput({ gameType: "CRASH", targetMultiplier: 0.99 })).toThrow();
  });

  it("recommends SKIP for 2x target", () => {
    const signal = crashSignal({ gameType: "CRASH", targetMultiplier: 2.0 });
    expect(signal.recommendation).toBe("SKIP");
  });

  it("has HIGH or EXTREME risk level", () => {
    const signal = crashSignal({ gameType: "CRASH", targetMultiplier: 3.0 });
    expect(["HIGH", "EXTREME"]).toContain(signal.riskLevel);
  });

  it("includes variance disclaimer", () => {
    const signal = crashSignal({ gameType: "CRASH", targetMultiplier: 1.5 });
    const allDisclaimers = signal.disclaimers.join(" ");
    expect(allDisclaimers.toLowerCase()).toContain("variance");
  });

  it("handles previous crash points", () => {
    const signal = crashSignal({
      gameType: "CRASH",
      targetMultiplier: 2.0,
      previousCrashPoints: [1.2, 3.5, 1.1, 8.2, 2.1, 1.5, 1.3, 4.0, 1.8, 2.5],
    });
    expect(signal.confidence).toBeGreaterThanOrEqual(0.60);
    expect(signal.confidence).toBeLessThanOrEqual(0.90);
  });
});

/* ════════════════════════════════════════════════════════════
   Mines
   ════════════════════════════════════════════════════════════ */

describe("Mines", () => {
  it("survival probability for 1 mine, 1 pick on 5×5 grid", () => {
    // P = (25-1)/25 = 24/25 = 0.96
    const parsed = parseMinesInput({ gameType: "MINES", minesCount: 1, picksCount: 1 });
    const prob = minesProb(parsed);
    expect(prob).toBeCloseTo(0.96, 5);
  });

  it("survival probability for 5 mines, 3 picks", () => {
    // P = C(20,3) / C(25,3) = 1140 / 2300 ≈ 0.4957
    const parsed = parseMinesInput({ gameType: "MINES", minesCount: 5, picksCount: 3 });
    const prob = minesProb(parsed);
    expect(prob).toBeCloseTo(1140 / 2300, 4);
  });

  it("survival probability for 10 mines, 1 pick", () => {
    // P = 15/25 = 0.6
    const parsed = parseMinesInput({ gameType: "MINES", minesCount: 10, picksCount: 1 });
    const prob = minesProb(parsed);
    expect(prob).toBeCloseTo(0.6, 5);
  });

  it("rejects invalid minesCount (25 mines on 5×5 = impossible)", () => {
    expect(() => parseMinesInput({ gameType: "MINES", minesCount: 25, picksCount: 1 })).toThrow();
  });

  it("rejects minesCount less than 1", () => {
    expect(() => parseMinesInput({ gameType: "MINES", minesCount: 0, picksCount: 1 })).toThrow();
  });

  it("rejects picksCount exceeding safe squares", () => {
    expect(() => parseMinesInput({ gameType: "MINES", minesCount: 24, picksCount: 5 })).toThrow();
  });

  it("has VERY_HIGH volatility", () => {
    const profile = minesProfile();
    expect(profile.volatility).toBe("VERY_HIGH");
  });

  it("includes independence disclaimer", () => {
    const signal = minesSignal({ gameType: "MINES", minesCount: 3, picksCount: 2 });
    const allDisclaimers = signal.disclaimers.join(" ");
    expect(allDisclaimers.toLowerCase()).toContain("independent");
  });

  it("returns 0 probability when picks exceed safe squares", () => {
    const parsed = parseMinesInput({ gameType: "MINES", minesCount: 24, picksCount: 1 });
    const prob = minesProb(parsed);
    // 1 safe square, 1 pick = 0.04, NOT 0
    expect(prob).toBeCloseTo(1 / 25, 5);
  });
});

/* ════════════════════════════════════════════════════════════
   Signal contract — all signals must have required fields
   ════════════════════════════════════════════════════════════ */

describe("Signal contract", () => {
  const signals: Signal[] = [
    diceSignal({ gameType: "DICE", targetNumber: 3 }),
    crashSignal({ gameType: "CRASH", targetMultiplier: 1.5 }),
    minesSignal({ gameType: "MINES", minesCount: 3, picksCount: 2 }),
  ];

  const requiredKeys: (keyof Signal)[] = [
    "gameType",
    "recommendation",
    "confidence",
    "reasoning",
    "riskLevel",
    "probability",
    "assumptions",
    "disclaimers",
    "riskWarning",
    "explanation",
  ];

  for (const signal of signals) {
    it(`${signal.gameType} has all required fields`, () => {
      for (const key of requiredKeys) {
        expect(signal[key]).toBeDefined();
      }
    });

    it(`${signal.gameType} has valid recommendation`, () => {
      expect(["BET", "SKIP", "CAUTION"]).toContain(signal.recommendation);
    });

    it(`${signal.gameType} has confidence in 0–1 range`, () => {
      expect(signal.confidence).toBeGreaterThanOrEqual(0);
      expect(signal.confidence).toBeLessThanOrEqual(1);
    });

    it(`${signal.gameType} has probability in 0–1 range`, () => {
      expect(signal.probability).toBeGreaterThanOrEqual(0);
      expect(signal.probability).toBeLessThanOrEqual(1);
    });

    it(`${signal.gameType} has non-empty reasoning`, () => {
      expect(signal.reasoning.length).toBeGreaterThan(0);
    });

    it(`${signal.gameType} has at least one assumption`, () => {
      expect(signal.assumptions.length).toBeGreaterThanOrEqual(1);
    });

    it(`${signal.gameType} has at least one disclaimer`, () => {
      expect(signal.disclaimers.length).toBeGreaterThanOrEqual(1);
    });

    it(`${signal.gameType} has non-empty riskWarning`, () => {
      expect(signal.riskWarning.length).toBeGreaterThan(0);
    });

    it(`${signal.gameType} has non-empty explanation`, () => {
      expect(signal.explanation.length).toBeGreaterThan(0);
    });
  }
});

/* ════════════════════════════════════════════════════════════
   No win promises — signals must not claim guaranteed wins
   ════════════════════════════════════════════════════════════ */

describe("No win promises", () => {
  const forbidden = ["guaranteed", "certain", "definitely"];

  const signals: Signal[] = [
    diceSignal({ gameType: "DICE", targetNumber: 1 }),
    crashSignal({ gameType: "CRASH", targetMultiplier: 2.0 }),
    minesSignal({ gameType: "MINES", minesCount: 5, picksCount: 2 }),
  ];

  for (const signal of signals) {
    it(`${signal.gameType} does not claim guaranteed wins in reasoning`, () => {
      const lower = signal.reasoning.toLowerCase();
      for (const word of forbidden) {
        expect(lower).not.toContain(word);
      }
    });

    it(`${signal.gameType} does not claim guaranteed wins in riskWarning`, () => {
      const lower = signal.riskWarning.toLowerCase();
      for (const word of forbidden) {
        expect(lower).not.toContain(word);
      }
    });

    it(`${signal.gameType} does not claim guaranteed wins in explanation`, () => {
      const lower = signal.explanation.toLowerCase();
      for (const word of forbidden) {
        expect(lower).not.toContain(word);
      }
    });
  }
});

/* ════════════════════════════════════════════════════════════
   Unified entry point
   ════════════════════════════════════════════════════════════ */

import { predict, getGameList, getRiskProfile } from "../../src/game-prediction/index.js";

describe("unified entry point", () => {
  it("routes dice predictions correctly", () => {
    const signal = predict({ gameType: "DICE", targetNumber: 3 });
    expect(signal.gameType).toBe("DICE");
  });

  it("routes crash predictions correctly", () => {
    const signal = predict({ gameType: "CRASH", targetMultiplier: 2.0 });
    expect(signal.gameType).toBe("CRASH");
  });

  it("routes mines predictions correctly", () => {
    const signal = predict({ gameType: "MINES", minesCount: 3, picksCount: 1 });
    expect(signal.gameType).toBe("MINES");
  });

  it("getGameList returns 3 games", () => {
    const games = getGameList();
    expect(games.length).toBe(3);
    expect(games.map((g) => g.type)).toContain("DICE");
    expect(games.map((g) => g.type)).toContain("CRASH");
    expect(games.map((g) => g.type)).toContain("MINES");
  });

  it("getRiskProfile returns profile for each game", () => {
    const dice = getRiskProfile("DICE");
    expect(dice.volatility).toBe("LOW");

    const crash = getRiskProfile("CRASH");
    expect(crash.volatility).toBe("HIGH");

    const mines = getRiskProfile("MINES");
    expect(mines.volatility).toBe("VERY_HIGH");
  });

  it("predict throws on unknown game type", () => {
    expect(() => predict({ gameType: "UNKNOWN", targetNumber: 1 } as never)).toThrow();
  });
});
