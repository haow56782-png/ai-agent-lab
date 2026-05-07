/**
 * Signal Output Adapter Tests — P3.2 Signal Output Contract & Decision Evidence Protocol
 *
 * Tests all 5 normalize* functions and the toSignalOutputContract factory.
 *
 * 1. normalizeFromDomainSignal — complete contract, confidence/risk mapping
 * 2. normalizeFromDecisionOutput — complete contract, decision action mapping
 * 3. normalizeFromPredictionResult — complete contract, factor extraction
 * 4. normalizeFromGameMetrics — complete contract, status mapping
 * 5. normalizeFromSimulation — complete contract, sensitivity factors
 * 6. toSignalOutputContract factory dispatch
 * 7. inferAction edge cases
 * 8. shouldRequireReview
 * 9. unknown/null/undefined input safety
 * 10. Compatible with P3.1 safeTrim fix
 */

import { describe, it, expect } from "vitest";
import {
  toSignalOutputContract,
  normalizeFromDomainSignal,
  normalizeFromDecisionOutput,
  normalizeFromPredictionResult,
  normalizeFromGameMetrics,
  normalizeFromSimulation,
  inferAction,
  shouldRequireReview,
} from "../../src/tools/signal-output-adapter.js";
import type { SignalOutputContract } from "../../src/protocols/signal-output-contract.js";
import { validateSignalContract, generateSignalId, resetSignalIdCounter } from "../../src/protocols/signal-output-contract.js";
import type { Signal, GameInput } from "../../src/game-prediction/domains/types.js";
import type { DecisionOutput } from "../../src/game-prediction/decision-engine/types.js";
import type { PredictionResult, GameMetrics } from "../../src/domain/game.js";

/* ── Helpers ────────────────────────────────────────────── */

function assertValidContract(contract: SignalOutputContract): void {
  const errors = validateSignalContract(contract);
  expect(errors, `Expected valid contract, got: ${errors.join(", ")}`).toEqual([]);
}

/* ── Test Data ──────────────────────────────────────────── */

const domainSignal: Signal = {
  gameType: "DICE",
  recommendation: "SKIP",
  confidence: 0.95,
  probability: 0.1667,
  expectedValue: 0.97,
  reasoning: "Negative EV for single number bet (16.67% win probability)",
  riskLevel: "LOW",
  assumptions: ["Fair 6-sided die", "No mechanical bias"],
  disclaimers: ["Past results do not affect future probability"],
  riskWarning: "Low volatility game, but each roll is independent",
  explanation: "Dice outcome prediction based on uniform probability distribution",
};

const decisionOutput: DecisionOutput = {
  action: "SKIP",
  strategyName: "conservative_ev",
  recommendedBetSize: 0,
  confidence: 0.85,
  riskLevel: "MEDIUM",
  reasoning: "Expected value below threshold; optimal to skip",
  assumptions: ["Bankroll = 100", "Risk preference = conservative"],
  warnings: ["House edge reduces long-term EV"],
  stopLoss: 50,
  explanationReport: "Full analysis: EV=-0.03, Kelly criterion suggests 0% allocation",
};

const predictionResult: PredictionResult = {
  game: "Gemini",
  prediction: "HIGH_VOLATILITY_UP",
  confidence: 0.65,
  factors: ["Slot volatility pattern", "Recent payout frequency", "RTP analysis"],
  mode: "DETAILED",
  timestamp: new Date().toISOString(),
};

const gameMetrics: GameMetrics = {
  game: "Gemini",
  timeframe: "24H",
  activeUsers: 1234,
  totalPredictions: 5678,
  avgAccuracy: 0.72,
  status: "ACTIVE",
};

const simulationParams = {
  label: "SIM_DICE_1M",
  confidence: 0.88,
  probability: 0.5,
  assumptions: ["Normal distribution", "1M trial sampling"],
  simulatedOutcome: "MEAN_REVERSION",
  probabilityRange: { min: 0.45, max: 0.55 } as { min: number; max: number },
  sensitivityFactors: [
    { name: "sample_size", impact: "0.02" },
    { name: "outlier_removal", impact: "0.01" },
  ],
  failureModes: ["sampling_error", "model_misspecification"],
  riskLevel: "MEDIUM" as const,
  reasoning: "Simulation convergence within expected bounds",
};

/* ── Tests ──────────────────────────────────────────────── */

describe("SignalOutputAdapter — normalizeFromDomainSignal", () => {
  it("returns a valid contract with all required fields", () => {
    const contract = normalizeFromDomainSignal(domainSignal, "predict_game_outcome");
    assertValidContract(contract);
    expect(contract.domain).toBe("prediction");
    expect(contract.tool_name).toBe("predict_game_outcome");
  });

  it("maps gameType/recommendation to outcome label", () => {
    const contract = normalizeFromDomainSignal(domainSignal, "predict_game_outcome");
    expect(contract.outcome.label).toContain("DICE");
    expect(contract.outcome.label).toContain("SKIP");
  });

  it("includes expectedValue in evidence when present", () => {
    const contract = normalizeFromDomainSignal(domainSignal, "predict_game_outcome");
    const evEvidence = contract.evidence.find((e) => e.key === "expected_value");
    expect(evEvidence).toBeDefined();
    expect(evEvidence!.value).toBe(0.97);
  });

  it("maps riskLevel correctly", () => {
    const contract = normalizeFromDomainSignal(domainSignal, "predict_game_outcome");
    expect(contract.risk.risk_level).toBe("LOW");
    expect(contract.risk.warnings).toContain(domainSignal.riskWarning);
  });

  it("maps recommendation to action", () => {
    const contract = normalizeFromDomainSignal(domainSignal, "predict_game_outcome");
    expect(contract.decision.recommendation).toBe("SKIP");
    expect(contract.decision.action).toBe("avoid");
  });

  it("includes trace_id when provided", () => {
    const contract = normalizeFromDomainSignal(domainSignal, "predict_game_outcome", "trace-123");
    expect(contract.audit.trace_id).toBe("trace-123");
  });

  it("sets reviewer_required true for HIGH risk", () => {
    const highRisk: Signal = {
      ...domainSignal,
      riskLevel: "HIGH",
      confidence: 0.3,
      recommendation: "CAUTION",
    };
    const contract = normalizeFromDomainSignal(highRisk, "predict_game_outcome");
    expect(contract.audit.reviewer_required).toBe(true);
  });

  it("handles missing expectedValue gracefully", () => {
    const noEv: Signal = { ...domainSignal, expectedValue: undefined };
    const contract = normalizeFromDomainSignal(noEv, "test_tool");
    expect(contract.factors.every((f) => f.name !== "expected_value")).toBe(true);
  });
});

describe("SignalOutputAdapter — normalizeFromDecisionOutput", () => {
  it("returns a valid contract with all required fields", () => {
    const contract = normalizeFromDecisionOutput(decisionOutput, "get_game_decision");
    assertValidContract(contract);
    expect(contract.domain).toBe("decision");
  });

  it("includes strategy and bet size in evidence", () => {
    const contract = normalizeFromDecisionOutput(decisionOutput, "get_game_decision");
    expect(contract.evidence.some((e) => e.key === "strategy")).toBe(true);
    expect(contract.evidence.some((e) => e.key === "recommended_bet_size")).toBe(true);
  });

  it("includes takeProfit in evidence when defined", () => {
    const withProfit: DecisionOutput = { ...decisionOutput, takeProfit: 200 };
    const contract = normalizeFromDecisionOutput(withProfit, "get_game_decision");
    expect(contract.evidence.some((e) => e.key === "take_profit")).toBe(true);
  });

  it("omits takeProfit from evidence when undefined", () => {
    const contract = normalizeFromDecisionOutput(decisionOutput, "get_game_decision");
    expect(contract.evidence.some((e) => e.key === "take_profit")).toBe(false);
  });

  it("maps SKIP action to avoid", () => {
    const contract = normalizeFromDecisionOutput(decisionOutput, "get_game_decision");
    expect(contract.decision.action).toBe("avoid");
  });

  it("maps PLAY action to enter", () => {
    const play: DecisionOutput = { ...decisionOutput, action: "PLAY" };
    const contract = normalizeFromDecisionOutput(play, "get_game_decision");
    expect(contract.decision.action).toBe("enter");
  });

  it("maps REDUCE_SIZE action to review", () => {
    const reduce: DecisionOutput = { ...decisionOutput, action: "REDUCE_SIZE" };
    const contract = normalizeFromDecisionOutput(reduce, "get_game_decision");
    expect(contract.decision.action).toBe("review");
  });

  it("maps STOP_SESSION action to wait", () => {
    const stop: DecisionOutput = { ...decisionOutput, action: "STOP_SESSION" };
    const contract = normalizeFromDecisionOutput(stop, "get_game_decision");
    expect(contract.decision.action).toBe("wait");
  });
});

describe("SignalOutputAdapter — normalizeFromPredictionResult", () => {
  it("returns a valid contract with all required fields", () => {
    const contract = normalizeFromPredictionResult(predictionResult, "predict_game_outcome");
    assertValidContract(contract);
    expect(contract.domain).toBe("prediction");
  });

  it("maps prediction to outcome label", () => {
    const contract = normalizeFromPredictionResult(predictionResult, "predict_game_outcome");
    expect(contract.outcome.label).toBe(predictionResult.prediction);
  });

  it("converts factors array to SignalFactor entries", () => {
    const contract = normalizeFromPredictionResult(predictionResult, "predict_game_outcome");
    expect(contract.factors.length).toBe(predictionResult.factors.length);
    expect(contract.factors[0].name).toBe("factor_1");
    expect(contract.factors[0].value).toBe(predictionResult.factors[0]);
  });

  it("derives risk_level from confidence", () => {
    const highConf: PredictionResult = { ...predictionResult, confidence: 0.9 };
    expect(normalizeFromPredictionResult(highConf, "t").risk.risk_level).toBe("LOW");

    const medConf: PredictionResult = { ...predictionResult, confidence: 0.45 };
    expect(normalizeFromPredictionResult(medConf, "t").risk.risk_level).toBe("MEDIUM");

    const lowConf: PredictionResult = { ...predictionResult, confidence: 0.1 };
    expect(normalizeFromPredictionResult(lowConf, "t").risk.risk_level).toBe("HIGH");
  });

  it("maps UP prediction direction to enter action", () => {
    const up: PredictionResult = { ...predictionResult, prediction: "UP_TREND" };
    const c = normalizeFromPredictionResult(up, "t");
    expect(c.decision.action).toBe("enter");
  });

  it("maps DOWN prediction direction to avoid action", () => {
    const down: PredictionResult = { ...predictionResult, prediction: "DOWN_TREND" };
    const c = normalizeFromPredictionResult(down, "t");
    expect(c.decision.action).toBe("avoid");
  });
});

describe("SignalOutputAdapter — normalizeFromGameMetrics", () => {
  it("returns a valid contract with all required fields", () => {
    const contract = normalizeFromGameMetrics(gameMetrics, "get_game_metrics");
    assertValidContract(contract);
    expect(contract.domain).toBe("prediction");
    expect(contract.tool_name).toBe("get_game_metrics");
  });

  it("maps metrics fields to evidence array", () => {
    const contract = normalizeFromGameMetrics(gameMetrics, "get_game_metrics");
    expect(contract.evidence.some((e) => e.key === "active_users")).toBe(true);
    expect(contract.evidence.some((e) => e.key === "total_predictions")).toBe(true);
    expect(contract.evidence.some((e) => e.key === "avg_accuracy")).toBe(true);
    expect(contract.evidence.some((e) => e.key === "status")).toBe(true);
  });

  it("sets LOW risk when active with good accuracy", () => {
    const c = normalizeFromGameMetrics(gameMetrics, "t");
    expect(c.risk.risk_level).toBe("LOW");
  });

  it("sets HIGH risk on ERROR status", () => {
    const err: GameMetrics = { ...gameMetrics, status: "ERROR" };
    const c = normalizeFromGameMetrics(err, "t");
    expect(c.risk.risk_level).toBe("HIGH");
    expect(c.risk.warnings).toContain("Metrics service reporting errors");
  });

  it("sets MEDIUM risk when accuracy < 0.5", () => {
    const lowAcc: GameMetrics = { ...gameMetrics, avgAccuracy: 0.4 };
    const c = normalizeFromGameMetrics(lowAcc, "t");
    expect(c.risk.risk_level).toBe("MEDIUM");
  });

  it("maps active status to review action", () => {
    const c = normalizeFromGameMetrics(gameMetrics, "t");
    expect(c.decision.action).toBe("review");
  });
});

describe("SignalOutputAdapter — normalizeFromSimulation", () => {
  it("returns a valid contract with all required fields", () => {
    const contract = normalizeFromSimulation(simulationParams, "simulate_outcome");
    assertValidContract(contract);
    expect(contract.domain).toBe("simulation");
  });

  it("includes sensitivity factors", () => {
    const contract = normalizeFromSimulation(simulationParams, "simulate_outcome");
    const sensitivityFactors = contract.factors.filter((f) => f.name.startsWith("sensitivity_"));
    expect(sensitivityFactors.length).toBe(simulationParams.sensitivityFactors.length);
    expect(sensitivityFactors[0].name).toBe("sensitivity_sample_size");
  });

  it("maps probability range to evidence", () => {
    const contract = normalizeFromSimulation(simulationParams, "simulate_outcome");
    expect(contract.evidence.some((e) => e.key === "probability_range_min")).toBe(true);
    expect(contract.evidence.some((e) => e.key === "probability_range_max")).toBe(true);
  });

  it("derives recomendation from confidence threshold", () => {
    const highConf = normalizeFromSimulation(
      { ...simulationParams, confidence: 0.7 },
      "t",
    );
    expect(highConf.decision.recommendation).toContain("Proceed");

    const lowConf = normalizeFromSimulation(
      { ...simulationParams, confidence: 0.3 },
      "t",
    );
    expect(lowConf.decision.recommendation).toContain("Avoid");
  });

  it("converts assumptions to warnings", () => {
    const contract = normalizeFromSimulation(simulationParams, "simulate_outcome");
    for (const a of simulationParams.assumptions) {
      expect(contract.risk.warnings).toContain(`Assumption: ${a}`);
    }
  });
});

describe("SignalOutputAdapter — toSignalOutputContract factory", () => {
  it("dispatches domain_signal to normalizeFromDomainSignal", () => {
    const contract = toSignalOutputContract(
      { type: "domain_signal", data: domainSignal },
      "predict_game_outcome",
    );
    assertValidContract(contract);
    expect(contract.domain).toBe("prediction");
  });

  it("dispatches decision_output to normalizeFromDecisionOutput", () => {
    const contract = toSignalOutputContract(
      { type: "decision_output", data: decisionOutput },
      "get_game_decision",
    );
    assertValidContract(contract);
    expect(contract.domain).toBe("decision");
  });

  it("dispatches prediction_result to normalizeFromPredictionResult", () => {
    const contract = toSignalOutputContract(
      { type: "prediction_result", data: predictionResult },
      "predict_game_outcome",
    );
    assertValidContract(contract);
    expect(contract.outcome.label).toBe(predictionResult.prediction);
  });

  it("dispatches game_metrics to normalizeFromGameMetrics", () => {
    const contract = toSignalOutputContract(
      { type: "game_metrics", data: gameMetrics },
      "get_game_metrics",
    );
    assertValidContract(contract);
    expect(contract.evidence.some((e) => e.key === "active_users")).toBe(true);
  });

  it("dispatches simulation to normalizeFromSimulation", () => {
    const contract = toSignalOutputContract(
      { type: "simulation", data: simulationParams },
      "simulate_outcome",
    );
    assertValidContract(contract);
    expect(contract.domain).toBe("simulation");
  });

  it("passes trace_id through all dispatch paths", () => {
    const contract = toSignalOutputContract(
      { type: "domain_signal", data: domainSignal },
      "test",
      "trace-factory-1",
    );
    expect(contract.audit.trace_id).toBe("trace-factory-1");
  });
});

describe("SignalOutputAdapter — inferAction", () => {
  it("returns avoid for confidence below 0.2", () => {
    expect(inferAction({ confidence: 0.1, riskLevel: "LOW" })).toBe("avoid");
  });

  it("returns avoid for EXTREME risk regardless of confidence", () => {
    expect(inferAction({ confidence: 0.9, riskLevel: "EXTREME" })).toBe("avoid");
  });

  it("returns wait for confidence 0.2-0.4", () => {
    expect(inferAction({ confidence: 0.3, riskLevel: "MEDIUM" })).toBe("wait");
  });

  it("returns wait for HIGH risk regardless of confidence", () => {
    expect(inferAction({ confidence: 0.9, riskLevel: "HIGH" })).toBe("wait");
  });

  it("returns review for confidence 0.4-0.6", () => {
    expect(inferAction({ confidence: 0.5, riskLevel: "LOW" })).toBe("review");
  });

  it("returns enter for high confidence low risk", () => {
    expect(inferAction({ confidence: 0.8, riskLevel: "LOW" })).toBe("enter");
  });

  it("returns unknown for very low confidence with no risk override", () => {
    expect(inferAction({ confidence: 0, riskLevel: "LOW" })).toBe("avoid"); // 0 < 0.2 → avoid
  });
});

describe("SignalOutputAdapter — shouldRequireReview", () => {
  function makeContract(overrides: Partial<SignalOutputContract>): SignalOutputContract {
    return {
      signal_id: "SIG-TEST",
      domain: "prediction",
      tool_name: "test",
      outcome: { label: "TEST", confidence: 0.5 },
      evidence: [],
      factors: [],
      timing: { generated_at: new Date().toISOString() },
      risk: { risk_level: "LOW", warnings: [], failure_modes: [] },
      decision: { recommendation: "SKIP", action: "avoid", reason: "test" },
      audit: { cost_guard_applied: false, reviewer_required: false },
      ...overrides,
    };
  }

  it("returns false for LOW risk without reviewer_required", () => {
    expect(shouldRequireReview(makeContract({}))).toBe(false);
  });

  it("returns true for HIGH risk", () => {
    expect(shouldRequireReview(makeContract({
      risk: { risk_level: "HIGH", warnings: [], failure_modes: [] },
    }))).toBe(true);
  });

  it("returns true for EXTREME risk", () => {
    expect(shouldRequireReview(makeContract({
      risk: { risk_level: "EXTREME", warnings: [], failure_modes: [] },
    }))).toBe(true);
  });

  it("returns true when reviewer_required is set", () => {
    expect(shouldRequireReview(makeContract({
      audit: { cost_guard_applied: false, reviewer_required: true },
    }))).toBe(true);
  });

  it("returns false for MEDIUM risk without reviewer_required", () => {
    expect(shouldRequireReview(makeContract({
      risk: { risk_level: "MEDIUM", warnings: [], failure_modes: [] },
    }))).toBe(false);
  });
});

describe("SignalOutputAdapter — input safety", () => {
  it("normalizeFromDomainSignal handles minimal signal", () => {
    const minimal: Signal = {
      gameType: "DICE",
      recommendation: "SKIP",
      confidence: 0,
      probability: 0,
      reasoning: "Minimal reasoning",
      riskLevel: "LOW",
      expectedValue: 0,
      assumptions: [],
      disclaimers: [],
      riskWarning: "No risk",
      explanation: "Minimal explanation",
    };
    const contract = normalizeFromDomainSignal(minimal, "test");
    assertValidContract(contract);
    expect(contract.outcome.confidence).toBe(0);
  });

  it("normalizeFromDecisionOutput handles minimal decision output", () => {
    const minimal: DecisionOutput = {
      action: "SKIP",
      strategyName: "none",
      recommendedBetSize: 0,
      confidence: 0,
      riskLevel: "LOW",
      reasoning: "Minimal reasoning",
      assumptions: [],
      warnings: [],
      stopLoss: 0,
      explanationReport: "Minimal report",
    };
    const contract = normalizeFromDecisionOutput(minimal, "test");
    assertValidContract(contract);
    expect(contract.outcome.confidence).toBe(0);
  });

  it("toSignalOutputContract does not throw on any valid input type", () => {
    expect(() =>
      toSignalOutputContract({ type: "domain_signal", data: domainSignal }, "test"),
    ).not.toThrow();
    expect(() =>
      toSignalOutputContract({ type: "decision_output", data: decisionOutput }, "test"),
    ).not.toThrow();
    expect(() =>
      toSignalOutputContract({ type: "prediction_result", data: predictionResult }, "test"),
    ).not.toThrow();
    expect(() =>
      toSignalOutputContract({ type: "game_metrics", data: gameMetrics }, "test"),
    ).not.toThrow();
    expect(() =>
      toSignalOutputContract({ type: "simulation", data: simulationParams }, "test"),
    ).not.toThrow();
  });

  it("generateSignalId produces unique IDs", () => {
    resetSignalIdCounter();
    const id1 = generateSignalId();
    const id2 = generateSignalId();
    expect(id1).not.toBe(id2);
    expect(id1.startsWith("SIG-")).toBe(true);
    expect(id2.startsWith("SIG-")).toBe(true);
  });
});
