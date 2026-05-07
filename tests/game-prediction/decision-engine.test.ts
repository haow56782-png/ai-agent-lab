import { describe, it, expect } from "vitest";
import { decide, selectStrategyName, getStrategy } from "../../src/game-prediction/decision-engine/index.js";
import type { DecisionInput, DecisionOutput } from "../../src/game-prediction/decision-engine/types.js";
import { diceSignal, crashSignal, minesSignal } from "./helpers.js";

/* ─── Helpers ─── */

function makeInput(overrides: Partial<DecisionInput> = {}): DecisionInput {
  return {
    gameType: "DICE",
    bankroll: 1000,
    betSize: 20,
    riskPreference: "balanced",
    recentResults: [],
    domainSignal: diceSignal(),
    ...overrides,
  };
}

const FORBIDDEN = ["guaranteed", "certain win", "sure profit", "必赚", "稳赢", "保证盈利"];

function hasForbidden(text: string): string[] {
  return FORBIDDEN.filter((word) => text.toLowerCase().includes(word.toLowerCase()));
}

/* ════════════════════════════════════════════════════════════
   Strategy selection
   ════════════════════════════════════════════════════════════ */

describe("Strategy selection", () => {
  it("selects correct strategy for each risk preference (DICE)", () => {
    expect(selectStrategyName("DICE", "conservative")).toBe("capital-preservation");
    expect(selectStrategyName("DICE", "balanced")).toBe("low-volatility-farming");
    expect(selectStrategyName("DICE", "aggressive")).toBe("high-risk-sniper");
  });

  it("selects correct strategy for each risk preference (CRASH)", () => {
    expect(selectStrategyName("CRASH", "conservative")).toBe("conservative-cashout");
    expect(selectStrategyName("CRASH", "balanced")).toBe("balanced-multiplier");
    expect(selectStrategyName("CRASH", "aggressive")).toBe("aggressive-multiplier");
  });

  it("selects correct strategy for each risk preference (MINES)", () => {
    expect(selectStrategyName("MINES", "conservative")).toBe("low-tile-safe");
    expect(selectStrategyName("MINES", "balanced")).toBe("balanced-reveal");
    expect(selectStrategyName("MINES", "aggressive")).toBe("high-volatility-reveal");
  });

  it("getStrategy returns a valid strategy object", () => {
    const strategy = getStrategy("DICE", "capital-preservation");
    expect(strategy.name).toBe("capital-preservation");
    expect(strategy.gameType).toBe("DICE");
  });

  it("getStrategy throws for unknown game type", () => {
    expect(() => getStrategy("POKER", "some-strategy")).toThrow();
  });

  it("getStrategy throws for unknown strategy name", () => {
    expect(() => getStrategy("DICE", "nonexistent")).toThrow();
  });
});

/* ════════════════════════════════════════════════════════════
   Decision output contract
   ════════════════════════════════════════════════════════════ */

describe("Decision output contract", () => {
  const outputs: DecisionOutput[] = [
    decide(makeInput({ gameType: "DICE", domainSignal: diceSignal() })),
    decide(makeInput({ gameType: "CRASH", domainSignal: crashSignal() })),
    decide(makeInput({ gameType: "MINES", domainSignal: minesSignal() })),
  ];

  const requiredKeys: (keyof DecisionOutput)[] = [
    "action",
    "strategyName",
    "recommendedBetSize",
    "confidence",
    "riskLevel",
    "reasoning",
    "assumptions",
    "warnings",
    "stopLoss",
    "explanationReport",
  ];

  for (const output of outputs) {
    it(`decision has all required fields`, () => {
      for (const key of requiredKeys) {
        expect(output[key]).toBeDefined();
      }
    });

    it(`action is a valid DecisionAction`, () => {
      expect(["PLAY", "SKIP", "REDUCE_SIZE", "STOP_SESSION"]).toContain(output.action);
    });

    it(`confidence is in 0-1 range`, () => {
      expect(output.confidence).toBeGreaterThanOrEqual(0);
      expect(output.confidence).toBeLessThanOrEqual(1);
    });

    it(`has non-empty reasoning`, () => {
      expect(output.reasoning.length).toBeGreaterThan(0);
    });

    it(`has at least one assumption`, () => {
      expect(output.assumptions.length).toBeGreaterThanOrEqual(1);
    });

    it(`has non-empty explanationReport`, () => {
      expect(output.explanationReport.length).toBeGreaterThan(0);
    });
  }
});

/* ════════════════════════════════════════════════════════════
   Risk preference → bet size
   ════════════════════════════════════════════════════════════ */

describe("Risk preference → bet size", () => {
  it("conservative recommends smaller bet size than balanced", () => {
    const conservative = decide(makeInput({ riskPreference: "conservative", domainSignal: diceSignal({ recommendation: "CAUTION", riskLevel: "MEDIUM", probability: 0.33 }) }));
    const balanced = decide(makeInput({ riskPreference: "balanced", domainSignal: diceSignal({ recommendation: "CAUTION", riskLevel: "MEDIUM", probability: 0.33 }) }));

    // Conservative should not recommend a LARGER bet than balanced
    if (conservative.action !== "STOP_SESSION" && conservative.action !== "SKIP") {
      if (balanced.action !== "STOP_SESSION" && balanced.action !== "SKIP") {
        expect(conservative.recommendedBetSize).toBeLessThanOrEqual(balanced.recommendedBetSize);
      }
    }
  });

  it("aggressive may use larger bet size but includes warnings", () => {
    const result = decide(makeInput({
      gameType: "DICE",
      riskPreference: "aggressive",
      bankroll: 1000,
      betSize: 50,
      domainSignal: diceSignal(),
    }));
    // Aggressive should always produce at least some warnings for high-risk context
    // (The high-risk-sniper strategy always includes warnings)
    expect(result.warnings.length).toBeGreaterThanOrEqual(1);
  });

  it("aggressive dice includes risk warnings in explanationReport", () => {
    const result = decide(makeInput({
      gameType: "DICE",
      riskPreference: "aggressive",
      domainSignal: diceSignal(),
    }));
    expect(result.explanationReport.toLowerCase()).toContain("risk");
  });
});

/* ════════════════════════════════════════════════════════════
   Bankroll constraints
   ════════════════════════════════════════════════════════════ */

describe("Bankroll constraints", () => {
  it("bankroll too small triggers STOP_SESSION", () => {
    const result = decide(makeInput({
      bankroll: 50,
      betSize: 100,
      domainSignal: diceSignal(),
    }));
    expect(result.action).toBe("STOP_SESSION");
    expect(result.reasoning).toContain("critically high");
  });

  it("bankroll zero triggers STOP_SESSION", () => {
    const result = decide(makeInput({
      bankroll: 0,
      betSize: 10,
      domainSignal: diceSignal(),
    }));
    expect(result.action).toBe("STOP_SESSION");
  });
});

/* ════════════════════════════════════════════════════════════
   Max loss
   ════════════════════════════════════════════════════════════ */

describe("Max loss", () => {
  it("maxLoss exceeded triggers STOP_SESSION", () => {
    const result = decide(makeInput({
      maxLoss: 50,
      recentResults: ["loss", "loss", "loss"],
      domainSignal: diceSignal(),
    }));
    // 3 losses * 20 bet = 60 total loss >= 50 maxLoss
    expect(result.action).toBe("STOP_SESSION");
  });

  it("consecutive losses within limit does not stop session", () => {
    const result = decide(makeInput({
      riskPreference: "balanced",
      maxLoss: 500,
      recentResults: ["loss", "loss"], // 2 losses, limit is 5 for balanced
      domainSignal: diceSignal(),
    }));
    expect(result.action).not.toBe("STOP_SESSION");
  });
});

/* ════════════════════════════════════════════════════════════
   Domain signal interaction
   ════════════════════════════════════════════════════════════ */

describe("Domain signal interaction", () => {
  it("domain SKIP + balanced preference does not produce PLAY", () => {
    const result = decide(makeInput({
      riskPreference: "balanced",
      domainSignal: diceSignal({ recommendation: "SKIP", probability: 0.167 }),
    }));
    expect(result.action).not.toBe("PLAY");
  });

  it("domain SKIP + conservative preference does not produce PLAY", () => {
    const result = decide(makeInput({
      riskPreference: "conservative",
      domainSignal: diceSignal({ recommendation: "SKIP", probability: 0.167 }),
    }));
    expect(result.action).not.toBe("PLAY");
  });

  it("domain SKIP + aggressive preference may PLAY but with warnings", () => {
    const result = decide(makeInput({
      riskPreference: "aggressive",
      domainSignal: diceSignal({ recommendation: "SKIP", probability: 0.167 }),
    }));
    // Aggressive may PLAY but must have warnings (strategy always includes them)
    if (result.action === "PLAY") {
      expect(result.warnings.length).toBeGreaterThanOrEqual(1);
    }
  });
});

/* ════════════════════════════════════════════════════════════
   No forbidden win language
   ════════════════════════════════════════════════════════════ */

describe("No forbidden win language", () => {
  const scenarios = [
    { name: "DICE conservative", input: makeInput({ riskPreference: "conservative", domainSignal: diceSignal() }) },
    { name: "DICE aggressive", input: makeInput({ riskPreference: "aggressive", domainSignal: diceSignal() }) },
    { name: "CRASH balanced", input: makeInput({ gameType: "CRASH", domainSignal: crashSignal() }) },
    { name: "MINES balanced", input: makeInput({ gameType: "MINES", domainSignal: minesSignal() }) },
  ];

  for (const { name, input } of scenarios) {
    it(`${name}: no forbidden language in reasoning`, () => {
      const result = decide(input);
      const violations = hasForbidden(result.reasoning);
      expect(violations).toEqual([]);
    });

    it(`${name}: no forbidden language in warnings`, () => {
      const result = decide(input);
      const allWarnings = result.warnings.join(" ");
      const violations = hasForbidden(allWarnings);
      expect(violations).toEqual([]);
    });

    it(`${name}: no forbidden language in explanationReport`, () => {
      const result = decide(input);
      const violations = hasForbidden(result.explanationReport);
      expect(violations).toEqual([]);
    });
  }
});

/* ════════════════════════════════════════════════════════════
   Edge cases
   ════════════════════════════════════════════════════════════ */

describe("Edge cases", () => {
  it("throws on missing gameType", () => {
    expect(() => decide(makeInput({ gameType: undefined as unknown as "DICE" }))).toThrow();
  });

  it("throws on invalid riskPreference", () => {
    expect(() => decide(makeInput({ riskPreference: "extreme" as "balanced" }))).toThrow();
  });

  it("handles empty recentResults gracefully", () => {
    const result = decide(makeInput({
      recentResults: [],
      domainSignal: diceSignal(),
    }));
    expect(result).toBeDefined();
  });

  it("handles all-loss recentResults", () => {
    const result = decide(makeInput({
      riskPreference: "balanced",
      recentResults: ["loss", "loss", "loss", "loss", "loss"], // 5 consecutive = stop for balanced
      maxLoss: 1000,
      domainSignal: diceSignal(),
    }));
    expect(result.action).toBe("STOP_SESSION");
  });

  it("handles all-win recentResults", () => {
    const result = decide(makeInput({
      recentResults: ["win", "win", "win"],
      domainSignal: diceSignal(),
    }));
    expect(result).toBeDefined();
    expect(result.action).not.toBe("STOP_SESSION");
  });
});
