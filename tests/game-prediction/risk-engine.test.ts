import { describe, it, expect } from "vitest";
import {
  checkBankroll,
  calculateRiskOfRuin,
  checkOverbet,
  calculateStopLoss,
  calculateTakeProfit,
  shouldStopSession,
  getRecommendedMaxBet,
} from "../../src/game-prediction/risk-engine/bankroll.js";
import { assessRisk } from "../../src/game-prediction/risk-engine/index.js";
import type { DecisionInput } from "../../src/game-prediction/decision-engine/types.js";
import { diceSignal } from "./helpers.js";

/* ════════════════════════════════════════════════════════════
   Bankroll
   ════════════════════════════════════════════════════════════ */

describe("Bankroll", () => {
  it("calculates exposure ratio correctly", () => {
    const status = checkBankroll(1000, 20, "balanced", 0, 0.5);
    expect(status.exposureRatio).toBe(0.02);
    expect(status.isOverbet).toBe(false);
  });

  it("detects overbet at warning level (10% of bankroll)", () => {
    const status = checkBankroll(1000, 100, "balanced", 0, 0.5);
    expect(status.isOverbet).toBe(true);
    expect(status.overbetLevel).toBe("warning");
  });

  it("detects overbet at severe level (15% of bankroll)", () => {
    const status = checkBankroll(1000, 150, "balanced", 0, 0.5);
    expect(status.isOverbet).toBe(true);
    expect(status.overbetLevel).toBe("severe");
  });

  it("detects overbet at critical level (50%+ of bankroll)", () => {
    const status = checkBankroll(1000, 600, "balanced", 0, 0.5);
    expect(status.isOverbet).toBe(true);
    expect(status.overbetLevel).toBe("critical");
  });

  it("calculates risk of ruin correctly", () => {
    // P(losing) = 0.8, need 10 bets to bust: 0.8^10 ≈ 0.107
    const ruin = calculateRiskOfRuin(1000, 100, 0.2, 0);
    expect(ruin).toBeCloseTo(Math.pow(0.8, 10), 2);
  });

  it("returns risk of ruin 1 when bet >= bankroll", () => {
    const ruin = calculateRiskOfRuin(100, 100, 0.5, 0);
    expect(ruin).toBe(1);
  });

  it("returns risk of ruin 1 when bankroll is 0", () => {
    const ruin = calculateRiskOfRuin(0, 100, 0.5, 0);
    expect(ruin).toBe(1);
  });

  it("returns risk of ruin 0 when loss probability is 0", () => {
    const ruin = calculateRiskOfRuin(1000, 100, 1.0, 0);
    expect(ruin).toBe(0);
  });

  it("checkOverbet returns none for small bet", () => {
    expect(checkOverbet(10, 1000).level).toBe("none");
    expect(checkOverbet(10, 1000).isOverbet).toBe(false);
  });

  it("checkOverbet returns critical for bet >= 50% bankroll", () => {
    const result = checkOverbet(500, 1000);
    expect(result.level).toBe("critical");
    expect(result.isOverbet).toBe(true);
  });

  it("checkOverbet returns warning for bet ~15% bankroll", () => {
    const result = checkOverbet(150, 1000);
    expect(result.level).toBe("warning");
  });

  it("calculateStopLoss uses correct factors", () => {
    expect(calculateStopLoss(1000, "conservative")).toBe(150);   // 15%
    expect(calculateStopLoss(1000, "balanced")).toBe(300);       // 30%
    expect(calculateStopLoss(1000, "aggressive")).toBe(500);     // 50%
  });

  it("calculateTakeProfit uses correct factors", () => {
    expect(calculateTakeProfit(1000, "conservative")).toBe(300); // 30%
    expect(calculateTakeProfit(1000, "balanced")).toBe(600);     // 60%
    expect(calculateTakeProfit(1000, "aggressive")).toBe(1000);  // 100%
  });

  it("shouldStopSession triggers on consecutive losses", () => {
    expect(shouldStopSession(4, "conservative").stop).toBe(true);
    expect(shouldStopSession(2, "conservative").stop).toBe(false);
    expect(shouldStopSession(6, "balanced").stop).toBe(true);
    expect(shouldStopSession(8, "aggressive").stop).toBe(true);
  });

  it("shouldStopSession triggers on maxLoss", () => {
    const result = shouldStopSession(0, "balanced", 500, 600);
    expect(result.stop).toBe(true);
    expect(result.reason).toContain("Total loss");
  });

  it("getRecommendedMaxBet uses correct exposure limits", () => {
    expect(getRecommendedMaxBet(1000, "conservative")).toBe(20);   // 2%
    expect(getRecommendedMaxBet(1000, "balanced")).toBe(50);       // 5%
    expect(getRecommendedMaxBet(1000, "aggressive")).toBe(100);    // 10%
  });
});

/* ════════════════════════════════════════════════════════════
   Risk Assessment
   ════════════════════════════════════════════════════════════ */

describe("assessRisk", () => {
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

  it("passes for reasonable inputs", () => {
    const result = assessRisk(makeInput());
    expect(result.passed).toBe(true);
    expect(result.stopSession).toBe(false);
  });

  it("stops session on critical overbet (bet > 50% bankroll)", () => {
    const result = assessRisk(makeInput({ bankroll: 100, betSize: 60 }));
    expect(result.stopSession).toBe(true);
  });

  it("stops session on maxLoss exceeded", () => {
    const result = assessRisk(makeInput({
      maxLoss: 100,
      recentResults: ["loss", "loss", "loss", "loss", "loss", "loss"],
    }));
    expect(result.stopSession).toBe(true);
  });

  it("stops session when bet exceeds bankroll", () => {
    const result = assessRisk(makeInput({ bankroll: 50, betSize: 100 }));
    expect(result.stopSession).toBe(true);
    expect(result.stopReason).toContain("critically high");
  });

  it("emits warnings for high risk of ruin", () => {
    const result = assessRisk(makeInput({
      bankroll: 100,
      betSize: 40,
    }));
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("recommends appropriate max bet", () => {
    const result = assessRisk(makeInput({ bankroll: 1000, riskPreference: "conservative" }));
    expect(result.recommendedMaxBet).toBe(20);
  });
});
