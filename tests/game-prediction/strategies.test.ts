import { describe, it, expect } from "vitest";
import { diceStrategies } from "../../src/game-prediction/strategies/dice-strategies.js";
import { crashStrategies } from "../../src/game-prediction/strategies/crash-strategies.js";
import { minesStrategies } from "../../src/game-prediction/strategies/mines-strategies.js";
import type { Strategy } from "../../src/game-prediction/strategies/types.js";
import type { DecisionInput } from "../../src/game-prediction/decision-engine/types.js";
import type { Signal } from "../../src/game-prediction/domains/types.js";
import { diceSignal, crashSignal, minesSignal } from "./helpers.js";

/* ─── Test utility ─── */

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

function checkForbidden(text: string): string[] {
  return FORBIDDEN.filter((word) => text.toLowerCase().includes(word.toLowerCase()));
}

/* ════════════════════════════════════════════════════════════
   All strategies — shared contract
   ════════════════════════════════════════════════════════════ */

describe("All strategies", () => {
  const all: Record<string, Record<string, Strategy>> = {
    dice: diceStrategies,
    crash: crashStrategies,
    mines: minesStrategies,
  };

  const signals: Record<string, Signal> = {
    dice: diceSignal(),
    crash: crashSignal(),
    mines: minesSignal(),
  };

  for (const [game, strategies] of Object.entries(all)) {
    for (const [name, strategy] of Object.entries(strategies)) {
      it(`${game}/${name} has valid metadata`, () => {
        expect(strategy.name).toBe(name);
        expect(strategy.gameType).toBe(game.toUpperCase());
        expect(["conservative", "balanced", "aggressive"]).toContain(strategy.riskPreference);
      });

      it(`${game}/${name} returns valid StrategyResult`, () => {
        const input = makeInput({ gameType: strategy.gameType as "DICE" | "CRASH" | "MINES", domainSignal: signals[game] });
        const result = strategy.evaluate(input, signals[game]);

        expect(["PLAY", "SKIP"]).toContain(result.action);
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
        expect(result.recommendedBetSizeFraction).toBeGreaterThanOrEqual(0);
        expect(typeof result.reasoning).toBe("string");
        expect(Array.isArray(result.warnings)).toBe(true);
      });

      it(`${game}/${name} contains no forbidden win language in reasoning`, () => {
        const input = makeInput({ gameType: strategy.gameType as "DICE" | "CRASH" | "MINES", domainSignal: signals[game] });
        const result = strategy.evaluate(input, signals[game]);
        const violations = checkForbidden(result.reasoning);
        expect(violations).toEqual([]);
      });

      it(`${game}/${name} contains no forbidden win language in warnings`, () => {
        const input = makeInput({ gameType: strategy.gameType as "DICE" | "CRASH" | "MINES", domainSignal: signals[game] });
        const result = strategy.evaluate(input, signals[game]);
        const allWarnings = result.warnings.join(" ");
        const violations = checkForbidden(allWarnings);
        expect(violations).toEqual([]);
      });
    }
  }
});

/* ════════════════════════════════════════════════════════════
   Conservative strategies use smaller bet fractions
   ════════════════════════════════════════════════════════════ */

describe("Bet size scaling by risk preference", () => {
  const input = makeInput();
  const dSignal = diceSignal();
  const cSignal = crashSignal();
  const mSignal = minesSignal();

  it("dice conservative fraction < balanced fraction", () => {
    const conservative = diceStrategies["capital-preservation"].evaluate(input, dSignal);
    const balanced = diceStrategies["low-volatility-farming"].evaluate(input, dSignal);
    if (conservative.action === "PLAY" && balanced.action === "PLAY") {
      expect(conservative.recommendedBetSizeFraction).toBeLessThan(balanced.recommendedBetSizeFraction);
    }
  });

  it("dice aggressive fraction > balanced fraction", () => {
    const aggressive = diceStrategies["high-risk-sniper"].evaluate(input, dSignal);
    const balanced = diceStrategies["low-volatility-farming"].evaluate(input, dSignal);
    expect(aggressive.recommendedBetSizeFraction).toBeGreaterThan(balanced.recommendedBetSizeFraction);
  });

  it("crash aggressive fraction > conservative fraction", () => {
    const conservative = crashStrategies["conservative-cashout"].evaluate(
      { ...input, domainSignal: cSignal }, cSignal,
    );
    const aggressive = crashStrategies["aggressive-multiplier"].evaluate(
      { ...input, domainSignal: cSignal }, cSignal,
    );
    if (conservative.action === "PLAY") {
      expect(aggressive.recommendedBetSizeFraction).toBeGreaterThan(conservative.recommendedBetSizeFraction);
    }
  });

  it("mines conservative fraction < aggressive fraction", () => {
    const conservative = minesStrategies["low-tile-safe"].evaluate(
      { ...input, domainSignal: mSignal }, mSignal,
    );
    const aggressive = minesStrategies["high-volatility-reveal"].evaluate(
      { ...input, domainSignal: mSignal }, mSignal,
    );
    if (conservative.action === "PLAY") {
      expect(aggressive.recommendedBetSizeFraction).toBeGreaterThan(conservative.recommendedBetSizeFraction);
    }
  });
});

/* ════════════════════════════════════════════════════════════
   Aggressive strategies include warnings
   ════════════════════════════════════════════════════════════ */

describe("Aggressive strategies include warnings", () => {
  it("dice high-risk-sniper has warnings", () => {
    const result = diceStrategies["high-risk-sniper"].evaluate(makeInput(), diceSignal());
    expect(result.warnings.length).toBeGreaterThanOrEqual(1);
  });

  it("crash aggressive-multiplier has warnings", () => {
    const result = crashStrategies["aggressive-multiplier"].evaluate(
      { ...makeInput(), domainSignal: crashSignal() }, crashSignal(),
    );
    expect(result.warnings.length).toBeGreaterThanOrEqual(1);
  });

  it("mines high-volatility-reveal has warnings", () => {
    const result = minesStrategies["high-volatility-reveal"].evaluate(
      { ...makeInput(), domainSignal: minesSignal() }, minesSignal(),
    );
    expect(result.warnings.length).toBeGreaterThanOrEqual(1);
  });
});
