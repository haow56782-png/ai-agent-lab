import { describe, it, expect } from "vitest";
import { analyzeBehavior } from "../../src/game-prediction/behavior/index.js";
import { buildSessionState } from "../../src/game-prediction/behavior/session-state.js";
import { detectLossChasing, detectOverbetAfterWin, detectHighFrequency, detectRiskMismatch, detectOverMaxLoss } from "../../src/game-prediction/behavior/pattern-detector.js";
import { evaluateTilt, evaluateFatigue } from "../../src/game-prediction/behavior/tilt-detector.js";
import { determineBehaviorState, determineIntervention } from "../../src/game-prediction/behavior/intervention.js";
import type { BetEntry, BehaviorInput, PatternMatch } from "../../src/game-prediction/behavior/types.js";
import type { DecisionOutput } from "../../src/game-prediction/decision-engine/types.js";

/* ─── Helpers ─── */

function makeDecision(overrides: Partial<DecisionOutput> = {}): DecisionOutput {
  return {
    action: "PLAY",
    strategyName: "low-volatility-farming",
    recommendedBetSize: 20,
    confidence: 0.7,
    riskLevel: "MEDIUM",
    reasoning: "Acceptable risk.",
    assumptions: [],
    warnings: [],
    stopLoss: 100,
    takeProfit: 200,
    explanationReport: "Test.",
    ...overrides,
  };
}

function makeBetEntry(
  betSize: number,
  result: "win" | "loss",
  payout: number,
  bankrollAfter: number,
  timestamp?: string,
): BetEntry {
  return {
    timestamp: timestamp ?? new Date().toISOString(),
    betSize,
    result,
    payout,
    bankrollAfter,
  };
}

function makeBehaviorInput(overrides: Partial<BehaviorInput> = {}): BehaviorInput {
  return {
    recentResults: ["win", "loss", "win", "loss", "win"],
    bankrollHistory: [1000, 980, 1020, 990, 1030],
    betHistory: [
      makeBetEntry(20, "win", 39, 1019),
      makeBetEntry(20, "loss", 0, 999),
      makeBetEntry(20, "win", 39, 1038),
    ],
    sessionDurationMinutes: 15,
    riskPreference: "balanced",
    currentDecision: makeDecision(),
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

const FORBIDDEN = ["guaranteed", "certain win", "sure profit", "必赚", "稳赢", "保证盈利"];

function hasForbidden(text: string): string[] {
  return FORBIDDEN.filter((word) => text.toLowerCase().includes(word.toLowerCase()));
}

/* ════════════════════════════════════════════════════════════
   Session State
   ════════════════════════════════════════════════════════════ */

describe("SessionState", () => {
  it("builds correct state from bet history", () => {
    const state = buildSessionState(
      [
        makeBetEntry(20, "win", 39, 1019, "2026-01-01T00:00:00Z"),
        makeBetEntry(30, "loss", 0, 989, "2026-01-01T00:05:00Z"),
        makeBetEntry(25, "win", 48, 1037, "2026-01-01T00:10:00Z"),
      ],
      [1000, 1019, 989, 1037],
      15,
      ["win", "loss", "win"],
    );
    expect(state.totalBets).toBe(3);
    expect(state.averageBetSize).toBe(25);
    expect(state.totalProfitLoss).toBe(12); // win 20→payout 39 = +19, loss 30→0 = -30, win 25→48 = +23. Total = 12
    expect(state.currentStreak.type).toBe("win");
    expect(state.currentStreak.count).toBe(1);
  });

  it("empty history produces empty state", () => {
    const state = buildSessionState([], [1000], 0, []);
    expect(state.totalBets).toBe(0);
    expect(state.averageBetSize).toBe(0);
    expect(state.totalProfitLoss).toBe(0);
  });
});

/* ════════════════════════════════════════════════════════════
   Pattern Detector
   ════════════════════════════════════════════════════════════ */

describe("PatternDetector — loss chasing", () => {
  it("detects loss chasing when bet size increases after consecutive losses", () => {
    const result = detectLossChasing(
      [
        makeBetEntry(20, "loss", 0, 980),
        makeBetEntry(20, "loss", 0, 960),
        makeBetEntry(30, "loss", 0, 930),
      ],
      ["loss", "loss", "loss"],
    );
    expect(result).not.toBeNull();
    expect(result!.pattern).toBe("loss_chasing");
    expect(["high", "medium", "critical"]).toContain(result!.severity);
  });

  it("returns null when not enough losses", () => {
    const result = detectLossChasing(
      [makeBetEntry(20, "loss", 0, 980)],
      ["loss"],
    );
    expect(result).toBeNull();
  });

  it("returns null when bet size doesn't increase", () => {
    const result = detectLossChasing(
      [
        makeBetEntry(20, "loss", 0, 980),
        makeBetEntry(20, "loss", 0, 960),
        makeBetEntry(20, "loss", 0, 940),
      ],
      ["loss", "loss", "loss"],
    );
    expect(result).toBeNull();
  });
});

describe("PatternDetector — over max loss", () => {
  it("detects when total loss exceeds maxLoss", () => {
    const result = detectOverMaxLoss(
      [
        makeBetEntry(80, "loss", 0, 920),
        makeBetEntry(80, "loss", 0, 840),
        makeBetEntry(80, "loss", 0, 760), // total loss = 240, maxLoss = 200
      ],
      200,
    );
    expect(result).not.toBeNull();
    expect(result!.pattern).toBe("over_max_loss");
    expect(result!.severity).toBe("high"); // 240 >= 200 but < 300, so "high" not "critical"
  });

  it("returns null when no maxLoss set", () => {
    const result = detectOverMaxLoss(
      [makeBetEntry(100, "loss", 0, 900)],
      undefined,
    );
    expect(result).toBeNull();
  });

  it("warns when approaching maxLoss", () => {
    const result = detectOverMaxLoss(
      [
        makeBetEntry(40, "loss", 0, 960),
        makeBetEntry(40, "loss", 0, 920),
      ],
      100,
    );
    expect(result).not.toBeNull();
    // totalLoss = 80 (>= 80% of 100 = 80, but < 100), so "medium"
    expect(result!.severity).toBe("medium");
  });
});

describe("PatternDetector — high frequency", () => {
  it("detects high frequency from short intervals", () => {
    const now = new Date();
    const result = detectHighFrequency(
      [
        new Date(now.getTime() - 2000).toISOString(),
        new Date(now.getTime() - 15000).toISOString(),
        new Date(now.getTime() - 10000).toISOString(),
        new Date(now.getTime() - 5000).toISOString(),
        now.toISOString(),
      ],
      10,
      5,
    );
    expect(result).not.toBeNull();
    expect(result!.pattern).toBe("high_frequency");
  });

  it("returns null with few bets", () => {
    const result = detectHighFrequency([], 10, 1);
    expect(result).toBeNull();
  });
});

describe("PatternDetector — overbet after win", () => {
  it("detects bet increase after a win", () => {
    const result = detectOverbetAfterWin([
      makeBetEntry(20, "win", 39, 1039),
      makeBetEntry(40, "win", 78, 1117), // 2x increase after win
    ]);
    expect(result).not.toBeNull();
    expect(result!.pattern).toBe("overbet_after_win");
  });

  it("returns null for normal bet changes", () => {
    const result = detectOverbetAfterWin([
      makeBetEntry(20, "win", 39, 1039),
      makeBetEntry(22, "loss", 0, 1017), // 10% increase < 50% threshold
    ]);
    expect(result).toBeNull();
  });
});

describe("PatternDetector — risk mismatch", () => {
  it("detects conservative user making oversized bets", () => {
    const result = detectRiskMismatch(
      [
        makeBetEntry(100, "loss", 0, 900),
        makeBetEntry(100, "loss", 0, 800),
        makeBetEntry(100, "win", 190, 990),
        makeBetEntry(100, "loss", 0, 890),
        makeBetEntry(100, "win", 190, 1080),
      ],
      "conservative",
      {
        totalBets: 5,
        sessionDurationMinutes: 30,
        averageBetSize: 100,
        betFrequencyPerMinute: 0.17,
        currentStreak: { type: "win", count: 1 },
        totalProfitLoss: 80,
        peakBankroll: 1100,
        currentBankroll: 1080,
        recentBetSizes: [100, 100, 100, 100, 100],
        recentResults: ["loss", "loss", "win", "loss", "win"],
        lastBetTimestamps: [],
      },
    );
    expect(result).not.toBeNull();
    expect(result!.pattern).toBe("risk_mismatch");
  });

  it("returns null when bets match risk profile", () => {
    const result = detectRiskMismatch(
      [makeBetEntry(20, "loss", 0, 980)],
      "balanced",
      {
        totalBets: 1,
        sessionDurationMinutes: 5,
        averageBetSize: 20,
        betFrequencyPerMinute: 0.2,
        currentStreak: { type: "loss", count: 1 },
        totalProfitLoss: -20,
        peakBankroll: 1000,
        currentBankroll: 980,
        recentBetSizes: [20],
        recentResults: ["loss"],
        lastBetTimestamps: [],
      },
    );
    expect(result).toBeNull();
  });
});

/* ════════════════════════════════════════════════════════════
   Tilt Detector
   ════════════════════════════════════════════════════════════ */

describe("TiltDetector", () => {
  it("detects tilt from consecutive losses + escalation", () => {
    const tiltEval = evaluateTilt(
      [
        makeBetEntry(20, "loss", 0, 980),
        makeBetEntry(25, "loss", 0, 955),
        makeBetEntry(30, "loss", 0, 925),
        makeBetEntry(40, "loss", 0, 885),
        makeBetEntry(50, "loss", 0, 835),
      ],
      ["loss", "loss", "loss", "loss", "loss"],
      {
        totalBets: 5,
        sessionDurationMinutes: 25,
        averageBetSize: 33,
        betFrequencyPerMinute: 0.2,
        currentStreak: { type: "loss", count: 5 },
        totalProfitLoss: -165,
        peakBankroll: 1000,
        currentBankroll: 835,
        recentBetSizes: [20, 25, 30, 40, 50],
        recentResults: ["loss", "loss", "loss", "loss", "loss"],
        lastBetTimestamps: [],
      },
      [],
    );
    expect(tiltEval.isTilt).toBe(true);
    expect(tiltEval.tiltScore).toBeGreaterThan(0);
    expect(tiltEval.contributingFactors.length).toBeGreaterThan(0);
  });

  it("returns not tilted for short history", () => {
    const tiltEval = evaluateTilt(
      [makeBetEntry(20, "loss", 0, 980)],
      ["loss"],
      {
        totalBets: 1,
        sessionDurationMinutes: 5,
        averageBetSize: 20,
        betFrequencyPerMinute: 0.2,
        currentStreak: { type: "loss", count: 1 },
        totalProfitLoss: -20,
        peakBankroll: 1000,
        currentBankroll: 980,
        recentBetSizes: [20],
        recentResults: ["loss"],
        lastBetTimestamps: [],
      },
      [],
    );
    expect(tiltEval.isTilt).toBe(false);
  });
});

/* ════════════════════════════════════════════════════════════
   Fatigue
   ════════════════════════════════════════════════════════════ */

describe("Fatigue", () => {
  it("detects severe fatigue after 120+ minutes", () => {
    const fatigue = evaluateFatigue(150, 20);
    expect(fatigue.isFatigued).toBe(true);
    expect(fatigue.fatigueLevel).toBe("severe");
  });

  it("no fatigue under 30 minutes", () => {
    const fatigue = evaluateFatigue(25, 5);
    expect(fatigue.isFatigued).toBe(false);
    expect(fatigue.fatigueLevel).toBe("none");
  });

  it("moderate fatigue for 60+ min high-frequency session", () => {
    const fatigue = evaluateFatigue(90, 60);
    expect(fatigue.isFatigued).toBe(true);
    expect(fatigue.fatigueLevel).toBe("moderate");
  });
});

/* ════════════════════════════════════════════════════════════
   Full behavior analysis pipeline
   ════════════════════════════════════════════════════════════ */

describe("Full behavior analysis", () => {
  it("returns NORMAL for standard safe behavior", () => {
    const result = analyzeBehavior(makeBehaviorInput());
    expect(result.behaviorState).toBe("NORMAL");
    expect(result.interventionLevel).toBe("NONE");
    expect(result.recommendedAction).toBe("KEEP");
  });

  it("detects loss chasing → STOP_REQUIRED", () => {
    const result = analyzeBehavior({
      recentResults: ["loss", "loss", "loss", "loss"],
      bankrollHistory: [1000, 980, 955, 925, 885],
      betHistory: [
        makeBetEntry(20, "loss", 0, 980),
        makeBetEntry(25, "loss", 0, 955),
        makeBetEntry(30, "loss", 0, 925),
        makeBetEntry(40, "loss", 0, 885),
      ],
      sessionDurationMinutes: 20,
      riskPreference: "balanced",
      currentDecision: makeDecision(),
      maxLoss: 500,
      timestamp: new Date().toISOString(),
    });
    expect(result.detectedPatterns.some((p) => p.pattern === "loss_chasing")).toBe(true);
    expect(["STOP_REQUIRED", "TILT", "CHASING_LOSS"]).toContain(result.behaviorState);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("detects severe fatigue → STOP_REQUIRED", () => {
    const result = analyzeBehavior(makeBehaviorInput({
      sessionDurationMinutes: 150,
      betHistory: Array.from({ length: 20 }, (_, i) =>
        makeBetEntry(20, i % 2 === 0 ? "win" : "loss", i % 2 === 0 ? 38 : 0, 1000 + (i % 2 === 0 ? 18 : -20)),
      ),
      recentResults: Array.from({ length: 20 }, (_, i) => (i % 2 === 0 ? "win" : "loss") as "win" | "loss"),
      bankrollHistory: Array.from({ length: 21 }, (_, i) => 1000 + i * 0), // simplified
    }));
    expect(result.behaviorState).toBe("STOP_REQUIRED");
    expect(result.interventionLevel).toBe("FORCE_STOP");
  });

  it("detects overbet after win → CAUTION", () => {
    const result = analyzeBehavior(makeBehaviorInput({
      betHistory: [
        makeBetEntry(20, "win", 39, 1039),
        makeBetEntry(50, "loss", 0, 989), // 2.5x increase after win
      ],
      recentResults: ["win", "loss"],
      bankrollHistory: [1000, 1039, 989],
    }));
    expect(result.detectedPatterns.some((p) => p.pattern === "overbet_after_win")).toBe(true);
    expect(["CAUTION", "NORMAL"]).toContain(result.behaviorState);
  });

  it("detects conservative user with mismatch", () => {
    const result = analyzeBehavior({
      recentResults: ["win", "win", "loss", "win", "win"],
      bankrollHistory: [1000, 1040, 1080, 1060, 1100, 1140],
      betHistory: [
        makeBetEntry(40, "win", 78, 1038),
        makeBetEntry(40, "win", 78, 1076),  // 40 is 4% — within conservative 5%
        makeBetEntry(40, "loss", 0, 1036),
        makeBetEntry(80, "win", 156, 1112),  // 80 is 8% — exceeds 5% limit
        makeBetEntry(80, "win", 156, 1188),  // 80 is 8% — exceeds 5% limit
      ],
      sessionDurationMinutes: 15,
      riskPreference: "conservative",
      currentDecision: makeDecision(),
      timestamp: new Date().toISOString(),
    });
    const mismatch = result.detectedPatterns.find((p) => p.pattern === "risk_mismatch");
    expect(mismatch).toBeDefined();
    expect(mismatch!.severity).toBe("high"); // 2 of last 5 oversized → "high"
  });

  it("output has all required fields", () => {
    const result = analyzeBehavior(makeBehaviorInput());
    expect(typeof result.behaviorState).toBe("string");
    expect(Array.isArray(result.detectedPatterns)).toBe(true);
    expect(typeof result.interventionLevel).toBe("string");
    expect(typeof result.recommendedAction).toBe("string");
    expect(result.decisionAdjustment).toBeDefined();
    expect(typeof result.decisionAdjustment.shouldDowngrade).toBe("boolean");
    expect(typeof result.decisionAdjustment.newAction).toBe("string");
    expect(typeof result.decisionAdjustment.confidenceReduction).toBe("number");
    expect(typeof result.reasoning).toBe("string");
    expect(Array.isArray(result.warnings)).toBe(true);
  });
});

/* ════════════════════════════════════════════════════════════
   Intervention
   ════════════════════════════════════════════════════════════ */

describe("Intervention", () => {
  it("STOP_REQUIRED maps to block intervention", () => {
    const result = determineIntervention("STOP_REQUIRED", []);
    expect(result.interventionLevel).toBe("FORCE_STOP");
    expect(result.recommendedAction).toBe("STOP_SESSION");
  });

  it("NORMAL maps to no intervention", () => {
    const result = determineIntervention("NORMAL", []);
    expect(result.interventionLevel).toBe("NONE");
    expect(result.recommendedAction).toBe("KEEP");
  });

  it("TILT with high severity maps to block", () => {
    const patterns: PatternMatch[] = [
      { pattern: "loss_chasing", severity: "high", description: "Test", detail: "Test" },
    ];
    const result = determineIntervention("TILT", patterns);
    expect(result.interventionLevel).toBe("FORCE_STOP");
  });

  it("CAUTION maps to SOFT_WARNING or HARD_WARNING", () => {
    const result = determineIntervention("CAUTION", [
      { pattern: "overbet_after_win", severity: "medium", description: "Test", detail: "Test" },
    ]);
    expect(["SOFT_WARNING", "HARD_WARNING"]).toContain(result.interventionLevel);
  });
});

/* ════════════════════════════════════════════════════════════
   Forbidden language
   ════════════════════════════════════════════════════════════ */

describe("Forbidden language", () => {
  it("no forbidden language in behavior output", () => {
    const result = analyzeBehavior(makeBehaviorInput());
    const text = `${result.reasoning} ${result.warnings.join(" ")} ${result.detectedPatterns.map((p) => `${p.description} ${p.detail}`).join(" ")}`;
    const found = hasForbidden(text);
    expect(found).toEqual([]);
  });

  it("no forbidden language in loss chasing output", () => {
    const result = analyzeBehavior({
      recentResults: ["loss", "loss", "loss"],
      bankrollHistory: [1000, 980, 955, 925],
      betHistory: [
        makeBetEntry(20, "loss", 0, 980),
        makeBetEntry(25, "loss", 0, 955),
        makeBetEntry(30, "loss", 0, 925),
      ],
      sessionDurationMinutes: 10,
      riskPreference: "balanced",
      currentDecision: makeDecision(),
      timestamp: new Date().toISOString(),
    });
    const text = JSON.stringify(result);
    const found = hasForbidden(text);
    expect(found).toEqual([]);
  });
});
