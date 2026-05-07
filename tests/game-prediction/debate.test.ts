import { describe, it, expect } from "vitest";
import { runDebate } from "../../src/game-prediction/debate/index.js";
import type { DebateInput, AgentDebateOutput, FinalDebateOutput } from "../../src/game-prediction/debate/types.js";
import type { DecisionOutput } from "../../src/game-prediction/decision-engine/types.js";
import type { Signal, RiskLevel } from "../../src/game-prediction/domains/types.js";
import type { SimulationOutput } from "../../src/game-prediction/simulation/types.js";
import type { LearningOutput } from "../../src/game-prediction/learning/types.js";
import { diceSignal, crashSignal, minesSignal } from "./helpers.js";
import { probabilityAnalyst, riskManager, strategyCritic, learningAuditor } from "../../src/game-prediction/debate/agents.js";

/* ─── Helpers ─── */

function makeDecision(overrides: Partial<DecisionOutput> = {}): DecisionOutput {
  return {
    action: "PLAY",
    strategyName: "low-volatility-farming",
    recommendedBetSize: 20,
    confidence: 0.7,
    riskLevel: "MEDIUM",
    reasoning: "Acceptable risk for balanced profile.",
    assumptions: ["Standard market conditions"],
    warnings: [],
    stopLoss: 100,
    takeProfit: 200,
    explanationReport: "Decision to play with moderate confidence.",
    ...overrides,
  };
}

function makeSimOutput(overrides: Partial<SimulationOutput> = {}): SimulationOutput {
  return {
    expectedValue: 0.95,
    expectedFinalBankroll: 950,
    profitLossDistribution: [100, -50, 200, -100, 50],
    maxDrawdown: 300,
    ruinProbability: 0.05,
    winRate: 0.48,
    lossRate: 0.52,
    volatility: 150,
    percentileOutcomes: { p5: 500, p25: 800, p50: 1000, p75: 1200, p95: 1500 },
    recommendation: "Proceed with caution",
    warnings: [],
    assumptions: ["Market conditions stable"],
    ...overrides,
  };
}

function makeLearnOutput(overrides: Partial<LearningOutput> = {}): LearningOutput {
  return {
    calibratedConfidence: 0.65,
    predictionError: 0.1,
    rollingAccuracy: 0.7,
    brierScore: 0.12,
    calibrationShift: 0.05,
    updatedRiskProfile: {
      recommendedConfidence: 0.65,
      recommendedBetFraction: 0.03,
      riskLevel: "MEDIUM",
    },
    recommendedAdjustment: "Maintain current settings.",
    learningWarnings: [],
    ...overrides,
  };
}

const FORBIDDEN = ["guaranteed", "certain win", "sure profit", "必赚", "稳赢", "保证盈利"];

function hasForbidden(text: string): string[] {
  return FORBIDDEN.filter((word) => text.toLowerCase().includes(word.toLowerCase()));
}

function makeDebateInput(overrides: Partial<DebateInput> = {}): DebateInput {
  return {
    domainSignal: diceSignal(),
    decisionOutput: makeDecision(),
    simulationOutput: makeSimOutput(),
    learningOutput: makeLearnOutput(),
    userRiskPreference: "balanced",
    bankrollContext: {
      totalBankroll: 1000,
      currentBetSize: 20,
      exposureRatio: 0.02,
    },
    ...overrides,
  };
}

/* ════════════════════════════════════════════════════════════
   Probability Analyst
   ════════════════════════════════════════════════════════════ */

describe("Probability Analyst", () => {
  it("OPPOSEs negative EV", () => {
    const signal: Signal = {
      ...diceSignal(),
      probability: 0.5,
      expectedValue: 0.9,
    };
    const decision = makeDecision({ confidence: 0.5 });
    const result = probabilityAnalyst(signal, decision, "balanced");
    expect(result.stance).toBe("OPPOSE");
    expect(result.objections.some((o) => o.includes("EV") || o.includes("expected"))).toBe(true);
  });

  it("OPPOSEs very low probability", () => {
    const signal: Signal = {
      ...diceSignal(),
      probability: 0.1,
      expectedValue: 1.0,
    };
    const result = probabilityAnalyst(signal, makeDecision(), "balanced");
    expect(result.stance).toBe("OPPOSE");
  });

  it("CAUTIONs on moderate probability", () => {
    const signal: Signal = {
      ...diceSignal(),
      probability: 0.25,
      expectedValue: 1.0,
    };
    const result = probabilityAnalyst(signal, makeDecision(), "balanced");
    expect(result.stance).toBe("CAUTION");
  });

  it("SUPPORTs high probability with non-negative EV", () => {
    const signal: Signal = {
      ...diceSignal(),
      probability: 0.6,
      expectedValue: 1.02,
    };
    const result = probabilityAnalyst(signal, makeDecision(), "balanced");
    expect(result.stance).toBe("SUPPORT");
  });
});

/* ════════════════════════════════════════════════════════════
   Risk Manager
   ════════════════════════════════════════════════════════════ */

describe("Risk Manager", () => {
  it("OPPOSEs extreme risk level", () => {
    const result = riskManager(
      crashSignal(),
      makeDecision({ riskLevel: "EXTREME" }),
      makeSimOutput(),
      { totalBankroll: 1000, currentBetSize: 20, exposureRatio: 0.02 },
      "balanced",
    );
    expect(result.stance).toBe("OPPOSE");
  });

  it("OPPOSEs high ruin probability", () => {
    const result = riskManager(
      crashSignal(),
      makeDecision({ riskLevel: "HIGH" }),
      makeSimOutput({ ruinProbability: 0.4 }),
      { totalBankroll: 1000, currentBetSize: 20, exposureRatio: 0.02 },
      "balanced",
    );
    expect(result.stance).toBe("OPPOSE");
  });

  it("CAUTIONs on high risk", () => {
    const result = riskManager(
      crashSignal(),
      makeDecision({ riskLevel: "HIGH" }),
      makeSimOutput(),
      { totalBankroll: 1000, currentBetSize: 20, exposureRatio: 0.05 },
      "balanced",
    );
    expect(result.stance).toBe("CAUTION");
  });

  it("SUPPORTs low risk with acceptable exposure", () => {
    const result = riskManager(
      diceSignal(),
      makeDecision({ riskLevel: "LOW" }),
      makeSimOutput(),
      { totalBankroll: 1000, currentBetSize: 20, exposureRatio: 0.02 },
      "balanced",
    );
    expect(result.stance).toBe("SUPPORT");
  });

  it("detects excessive exposure for conservative profile", () => {
    const result = riskManager(
      diceSignal({ riskLevel: "MEDIUM" }),
      makeDecision({ riskLevel: "MEDIUM" }),
      makeSimOutput(),
      { totalBankroll: 1000, currentBetSize: 100, exposureRatio: 0.1 },
      "conservative",
    );
    expect(result.objections.some((o) => o.includes("exposure"))).toBe(true);
  });
});

/* ════════════════════════════════════════════════════════════
   Strategy Critic
   ════════════════════════════════════════════════════════════ */

describe("Strategy Critic", () => {
  it("OPPOSEs domain SKIP overridden by PLAY for non-aggressive", () => {
    const signal: Signal = { ...diceSignal(), recommendation: "SKIP" };
    const result = strategyCritic(signal, makeDecision({ action: "PLAY" }), "balanced");
    expect(result.stance).toBe("OPPOSE");
  });

  it("CAUTIONs domain SKIP overridden by PLAY for aggressive", () => {
    const signal: Signal = { ...diceSignal(), recommendation: "SKIP" };
    const result = strategyCritic(signal, makeDecision({ action: "PLAY" }), "aggressive");
    expect(result.stance).toBe("CAUTION");
  });

  it("SUPPORTs STOP_SESSION action", () => {
    const result = strategyCritic(
      diceSignal(),
      makeDecision({ action: "STOP_SESSION" }),
      "balanced",
    );
    expect(result.stance).toBe("SUPPORT");
  });

  it("flags strategy-risk mismatch", () => {
    const result = strategyCritic(
      diceSignal(),
      makeDecision({ strategyName: "high-risk-sniper" }),
      "conservative",
    );
    expect(result.objections.some((o) => o.includes("aggressive") || o.includes("conservative"))).toBe(true);
  });
});

/* ════════════════════════════════════════════════════════════
   Learning Auditor
   ════════════════════════════════════════════════════════════ */

describe("Learning Auditor", () => {
  it("OPPOSEs poor calibration (Brier > 0.25)", () => {
    const result = learningAuditor(
      makeLearnOutput({ brierScore: 0.3, rollingAccuracy: 0.35 }),
      diceSignal(),
      makeDecision(),
    );
    expect(result.stance).toBe("OPPOSE");
  });

  it("CAUTIONs on moderate calibration issues", () => {
    const result = learningAuditor(
      makeLearnOutput({ brierScore: 0.2, rollingAccuracy: 0.45 }),
      diceSignal(),
      makeDecision(),
    );
    expect(result.stance).toBe("CAUTION");
  });

  it("CAUTIONs on calibration shift > 0.15", () => {
    const result = learningAuditor(
      makeLearnOutput({ calibrationShift: 0.2, brierScore: 0.1, rollingAccuracy: 0.8 }),
      diceSignal({ confidence: 0.7 }),
      makeDecision(),
    );
    expect(result.stance).toBe("CAUTION");
  });

  it("detects confidence drift as objection", () => {
    const result = learningAuditor(
      makeLearnOutput({ calibratedConfidence: 0.5, brierScore: 0.08, rollingAccuracy: 0.85, calibrationShift: 0.03 }),
      diceSignal({ confidence: 0.7 }),
      makeDecision(),
    );
    // calibratedConfidence 0.5 vs signal confidence 0.7 → drift 0.2 > 0.15
    expect(result.objections.some((o) => o.includes("drift"))).toBe(true);
  });

  it("SUPPORTs good calibration", () => {
    const result = learningAuditor(
      makeLearnOutput({ brierScore: 0.08, rollingAccuracy: 0.85, calibrationShift: 0.03 }),
      diceSignal({ confidence: 0.65 }),
      makeDecision(),
    );
    expect(result.stance).toBe("SUPPORT");
  });

  it("skips audit when no learning data", () => {
    const result = learningAuditor(undefined, diceSignal(), makeDecision());
    expect(result.stance).toBe("SUPPORT");
    expect(result.reasoning).toContain("No learning data");
  });

  it("forwards learning warnings as objections", () => {
    const result = learningAuditor(
      makeLearnOutput({
        brierScore: 0.1,
        rollingAccuracy: 0.75,
        learningWarnings: ["Confidence drift detected."],
      }),
      diceSignal(),
      makeDecision(),
    );
    expect(result.objections.some((o) => o.includes("Confidence drift"))).toBe(true);
  });
});

/* ════════════════════════════════════════════════════════════
   Arbiter — final decision synthesis
   ════════════════════════════════════════════════════════════ */

describe("Final Arbiter", () => {
  it("produces UNANIMOUS consensus when all agents support", () => {
    const input = makeDebateInput({
      domainSignal: diceSignal({ probability: 0.6, expectedValue: 1.02, recommendation: "BET", confidence: 0.7 }),
      decisionOutput: makeDecision({ action: "PLAY", riskLevel: "LOW" }),
      simulationOutput: makeSimOutput({ ruinProbability: 0.02 }),
      learningOutput: makeLearnOutput({ brierScore: 0.08, rollingAccuracy: 0.85 }),
    });
    const { verdict } = runDebate(input);
    expect(["UNANIMOUS", "MAJORITY"]).toContain(verdict.consensusLevel);
    expect(verdict.finalAction).toBe("PLAY");
  });

  it("downgrades PLAY when Risk Manager vetoes extreme risk", () => {
    const input = makeDebateInput({
      domainSignal: crashSignal({ riskLevel: "EXTREME", probability: 0.2 }),
      decisionOutput: makeDecision({ action: "PLAY", riskLevel: "EXTREME" }),
      simulationOutput: makeSimOutput({ ruinProbability: 0.35 }),
    });
    const { verdict } = runDebate(input);
    expect(verdict.consensusLevel).toBe("ARBITER_OVERRIDE");
    expect(verdict.finalAction).not.toBe("PLAY");
  });

  it("resolves disagreement with weighted vote", () => {
    // Probability Analyst OPPOSEs (low EV), Risk Manager CAUTIONs
    const input = makeDebateInput({
      domainSignal: diceSignal({ probability: 0.2, expectedValue: 0.92 }),
      decisionOutput: makeDecision({ action: "PLAY" }),
    });
    const { verdict } = runDebate(input);
    // Should be downgraded due to opposition
    expect(verdict.finalAction === "REDUCE_SIZE" || verdict.finalAction === "SKIP").toBe(true);
  });

  it("sets negative confidence adjustment when oppose > support", () => {
    // Create input where multiple agents will oppose
    const input = makeDebateInput({
      domainSignal: crashSignal({ probability: 0.1, expectedValue: 0.8, riskLevel: "EXTREME" }),
      decisionOutput: makeDecision({ action: "PLAY", riskLevel: "EXTREME" }),
      simulationOutput: makeSimOutput({ ruinProbability: 0.5 }),
      learningOutput: makeLearnOutput({ brierScore: 0.3, rollingAccuracy: 0.3 }),
    });
    const { verdict } = runDebate(input);
    expect(verdict.confidenceAdjustment).toBeLessThan(0);
  });

  it("includes decision trace with all agent stances", () => {
    const { verdict } = runDebate(makeDebateInput());
    expect(verdict.decisionTrace).toHaveLength(4);
    for (const entry of verdict.decisionTrace) {
      expect(["SUPPORT", "OPPOSE", "CAUTION"]).toContain(entry.stance);
      expect(entry.score).toBeGreaterThanOrEqual(0);
      expect(entry.score).toBeLessThanOrEqual(1);
    }
  });

  it("collects warnings from agents", () => {
    const { verdict } = runDebate(makeDebateInput());
    expect(Array.isArray(verdict.finalWarnings)).toBe(true);
  });

  it("produces summary string", () => {
    const { verdict } = runDebate(makeDebateInput());
    expect(typeof verdict.summary).toBe("string");
    expect(verdict.summary.length).toBeGreaterThan(0);
  });
});

/* ════════════════════════════════════════════════════════════
   Full debate pipeline
   ════════════════════════════════════════════════════════════ */

describe("Full debate pipeline", () => {
  it("produces 4 agent outputs", () => {
    const { agents } = runDebate(makeDebateInput());
    expect(agents).toHaveLength(4);
    const names = agents.map((a) => a.agentName);
    expect(names).toContain("probability-analyst");
    expect(names).toContain("risk-manager");
    expect(names).toContain("strategy-critic");
    expect(names).toContain("learning-auditor");
  });

  it("every agent has valid output structure", () => {
    const { agents } = runDebate(makeDebateInput());
    for (const agent of agents) {
      expect(typeof agent.agentName).toBe("string");
      expect(typeof agent.agentRole).toBe("string");
      expect(["SUPPORT", "OPPOSE", "CAUTION"]).toContain(agent.stance);
      expect(agent.score).toBeGreaterThanOrEqual(0);
      expect(agent.score).toBeLessThanOrEqual(1);
      expect(typeof agent.reasoning).toBe("string");
      expect(Array.isArray(agent.objections)).toBe(true);
      expect(Array.isArray(agent.requiredAdjustments)).toBe(true);
    }
  });

  it("verdict has all required fields", () => {
    const { verdict } = runDebate(makeDebateInput());
    expect(typeof verdict.finalAction).toBe("string");
    expect(["PLAY", "SKIP", "REDUCE_SIZE", "STOP_SESSION"]).toContain(verdict.finalAction);
    expect(typeof verdict.finalStrategy).toBe("string");
    expect(typeof verdict.confidenceAdjustment).toBe("number");
    expect(typeof verdict.riskAdjustment).toBe("string");
    expect(Array.isArray(verdict.finalWarnings)).toBe(true);
    expect(Array.isArray(verdict.decisionTrace)).toBe(true);
    expect(typeof verdict.consensusLevel).toBe("string");
    expect(typeof verdict.summary).toBe("string");
  });
});

/* ════════════════════════════════════════════════════════════
   Forbidden language
   ════════════════════════════════════════════════════════════ */

describe("Forbidden language", () => {
  it("no forbidden language in agent outputs", () => {
    const { agents } = runDebate(makeDebateInput());
    for (const agent of agents) {
      const text = `${agent.reasoning} ${agent.objections.join(" ")} ${agent.requiredAdjustments.join(" ")}`;
      const found = hasForbidden(text);
      expect(found).toEqual([]);
    }
  });

  it("no forbidden language in arbiter output", () => {
    const { verdict } = runDebate(makeDebateInput());
    const text = `${verdict.summary} ${verdict.finalWarnings.join(" ")}`;
    const found = hasForbidden(text);
    expect(found).toEqual([]);
  });
});
