/**
 * Signal Output Adapter — Converts raw tool outputs into structured
 * SignalOutputContract for all prediction / decision / simulation tools.
 *
 * Each normalize* function handles one source type. The toSignalOutputContract()
 * factory dispatches to the correct normalizer based on domain and source type.
 *
 * ============================================================
 *  P3.2 Signal Output Contract & Decision Evidence Protocol
 * ============================================================ */

import type {
  SignalOutputContract,
  SignalDomain,
  SignalRiskLevel,
  SignalAction,
  SignalDirection,
  SignalFactor,
  SignalEvidence,
  SignalOutcome,
  SignalTiming,
  SignalRisk,
  SignalDecision,
  SignalAudit,
} from "../protocols/signal-output-contract.js";
import { generateSignalId } from "../protocols/signal-output-contract.js";
import type { Signal as DomainSignal } from "../game-prediction/domains/types.js";
import type { DecisionOutput } from "../game-prediction/decision-engine/types.js";
import type { PredictionResult, GameMetrics } from "../domain/game.js";

/* ── Direction mapping ──────────────────────────────────── */

function predictionToDirection(prediction: string): SignalDirection {
  const p = prediction.toUpperCase();
  if (p.includes("UP") || p.includes("HIGH")) return "up";
  if (p.includes("DOWN") || p.includes("LOW")) return "down";
  if (p.includes("NEUTRAL")) return "neutral";
  return "unknown";
}

/* ── Action mapping ─────────────────────────────────────── */

function recommendationToAction(recommendation: string): SignalAction {
  const r = recommendation.toUpperCase();
  if (r === "BET" || r === "PLAY") return "enter";
  if (r === "SKIP") return "avoid";
  if (r === "CAUTION" || r === "REDUCE_SIZE") return "review";
  if (r === "STOP_SESSION" || r === "WAIT") return "wait";
  return "unknown";
}

/* ── Warnings → failure modes ───────────────────────────── */

function warningsToFailureModes(warnings: string[]): string[] {
  const modes: string[] = [];
  for (const w of warnings) {
    if (w.toLowerCase().includes("variance") || w.toLowerCase().includes("volatility")) {
      modes.push("high_variance");
    }
    if (w.toLowerCase().includes("bankroll") || w.toLowerCase().includes("loss")) {
      modes.push("bankroll_depletion");
    }
    if (w.toLowerCase().includes("streak") || w.toLowerCase().includes("tilt")) {
      modes.push("behavioral_bias");
    }
  }
  if (modes.length === 0) {
    modes.push("model_uncertainty");
  }
  return modes;
}

/* ── 1. Normalize from Domain Signal (game-prediction) ──── */

export function normalizeFromDomainSignal(
  signal: DomainSignal,
  toolName: string,
  traceId?: string,
): SignalOutputContract {
  const outcomeLabel = `${signal.gameType}_${signal.recommendation}`;

  const evidence: SignalEvidence[] = [
    { key: "game_type", value: signal.gameType, source: "domain", weight: 1.0 },
    { key: "probability", value: signal.probability, source: "domain", weight: 0.9 },
    { key: "expected_value", value: signal.expectedValue ?? null, source: "domain", weight: 0.7 },
  ];

  const factors: SignalFactor[] = [
    { name: "base_probability", value: signal.probability, weight: 0.9, explanation: signal.reasoning },
    { name: "risk_assessment", value: signal.riskLevel, weight: 0.8, explanation: signal.riskWarning },
    ...(signal.expectedValue !== undefined
      ? [{ name: "expected_value" as const, value: signal.expectedValue, weight: 0.7, explanation: "Expected return multiplier" }]
      : []),
  ];

  const risk: SignalRisk = {
    risk_level: signal.riskLevel,
    warnings: [signal.riskWarning, ...signal.disclaimers],
    failure_modes: warningsToFailureModes([signal.riskWarning, ...signal.disclaimers]),
  };

  const decision: SignalDecision = {
    recommendation: signal.recommendation,
    action: recommendationToAction(signal.recommendation),
    reason: signal.reasoning,
  };

  return buildContract({
    domain: "prediction",
    toolName,
    outcomeLabel,
    confidence: signal.confidence,
    probability: signal.probability,
    evidence,
    factors,
    risk,
    decision,
    traceId,
  });
}

/* ── 2. Normalize from Decision Output ──────────────────── */

export function normalizeFromDecisionOutput(
  decision: DecisionOutput,
  toolName: string,
  traceId?: string,
): SignalOutputContract {
  const outcomeLabel = `DECISION_${decision.action}`;

  const evidence: SignalEvidence[] = [
    { key: "action", value: decision.action, source: "decision_engine", weight: 1.0 },
    { key: "strategy", value: decision.strategyName, source: "decision_engine", weight: 0.8 },
    { key: "recommended_bet_size", value: decision.recommendedBetSize, source: "decision_engine", weight: 0.9 },
    { key: "stop_loss", value: decision.stopLoss, source: "decision_engine", weight: 0.7 },
    ...(decision.takeProfit !== undefined
      ? [{ key: "take_profit" as const, value: decision.takeProfit, source: "decision_engine" as const, weight: 0.5 }]
      : []),
  ];

  const factors: SignalFactor[] = [
    { name: "strategy", value: decision.strategyName, weight: 0.9, explanation: decision.reasoning },
    { name: "bet_size_analysis", value: decision.recommendedBetSize, weight: 0.8, explanation: `Recommended bet size based on risk profile` },
    { name: "risk_level", value: decision.riskLevel, weight: 0.9, explanation: decision.explanationReport },
  ];

  const risk: SignalRisk = {
    risk_level: decision.riskLevel,
    warnings: decision.warnings,
    failure_modes: warningsToFailureModes(decision.warnings),
  };

  const decisionBlock: SignalDecision = {
    recommendation: decision.action,
    action: recommendationToAction(decision.action),
    reason: decision.reasoning,
  };

  return buildContract({
    domain: "decision",
    toolName,
    outcomeLabel,
    confidence: decision.confidence,
    evidence,
    factors,
    risk,
    decision: decisionBlock,
    traceId,
  });
}

/* ── 3. Normalize from Legacy PredictionResult ──────────── */

export function normalizeFromPredictionResult(
  result: PredictionResult,
  toolName: string,
  traceId?: string,
): SignalOutputContract {
  const outcomeLabel = result.prediction;
  const direction = predictionToDirection(result.prediction);

  const evidence: SignalEvidence[] = [
    { key: "game", value: result.game, source: "legacy_domain", weight: 1.0 },
    { key: "prediction", value: result.prediction, source: "legacy_domain", weight: 0.9 },
    { key: "mode", value: result.mode, source: "legacy_domain", weight: 0.5 },
  ];

  const factors: SignalFactor[] = result.factors.map((f, i) => ({
    name: `factor_${i + 1}`,
    value: f,
    weight: 0.5,
    explanation: f,
  }));

  const risk: SignalRisk = {
    risk_level: result.confidence < 0.3 ? "HIGH" : result.confidence < 0.6 ? "MEDIUM" : "LOW",
    warnings: ["Legacy prediction — limited factor analysis"],
    failure_modes: ["model_uncertainty"],
  };

  const decisionBlock: SignalDecision = {
    recommendation: result.prediction,
    action: direction === "up" ? "enter" : direction === "down" ? "avoid" : "review",
    reason: `Prediction: ${result.prediction} (confidence: ${result.confidence})`,
  };

  return buildContract({
    domain: "prediction",
    toolName,
    outcomeLabel,
    confidence: result.confidence,
    evidence,
    factors,
    risk,
    decision: decisionBlock,
    traceId,
  });
}

/* ── 4. Normalize from GameMetrics ──────────────────────── */

export function normalizeFromGameMetrics(
  metrics: GameMetrics,
  toolName: string,
  traceId?: string,
): SignalOutputContract {
  const outcomeLabel = `METRICS_${metrics.game}_${metrics.timeframe}`;

  const evidence: SignalEvidence[] = [
    { key: "active_users", value: metrics.activeUsers, source: "metrics_service", weight: 0.8 },
    { key: "total_predictions", value: metrics.totalPredictions, source: "metrics_service", weight: 0.7 },
    { key: "avg_accuracy", value: metrics.avgAccuracy, source: "metrics_service", weight: 0.9 },
    { key: "status", value: metrics.status, source: "metrics_service", weight: 0.5 },
  ];

  const factors: SignalFactor[] = [
    { name: "user_activity", value: metrics.activeUsers, weight: 0.6, explanation: `Active users in ${metrics.timeframe}` },
    { name: "accuracy_trend", value: metrics.avgAccuracy, weight: 0.8, explanation: `Historical average accuracy` },
  ];

  const risk: SignalRisk = {
    risk_level: metrics.status === "ERROR" ? "HIGH" : metrics.avgAccuracy < 0.5 ? "MEDIUM" : "LOW",
    warnings: metrics.status === "ERROR" ? ["Metrics service reporting errors"] : [],
    failure_modes: metrics.status === "ERROR" ? ["service_unavailable"] : ["data_staleness"],
  };

  const decisionBlock: SignalDecision = {
    recommendation: metrics.status === "ACTIVE" ? "Metrics available — proceed" : "Data pending — verify source",
    action: metrics.status === "ACTIVE" ? "review" : "wait",
    reason: `${metrics.game} on ${metrics.timeframe}: ${metrics.activeUsers} users, ${metrics.avgAccuracy * 100}% accuracy`,
  };

  return buildContract({
    domain: "prediction",
    toolName,
    outcomeLabel,
    confidence: metrics.avgAccuracy,
    evidence,
    factors,
    risk,
    decision: decisionBlock,
    traceId,
  });
}

/* ── 5. Normalize from simulation-style input ───────────── */

export function normalizeFromSimulation(
  params: {
    label: string;
    confidence: number;
    probability: number;
    assumptions: string[];
    simulatedOutcome: string;
    probabilityRange: { min: number; max: number };
    sensitivityFactors: Array<{ name: string; impact: string }>;
    failureModes: string[];
    riskLevel: SignalRiskLevel;
    reasoning: string;
    traceId?: string;
  },
  toolName: string,
): SignalOutputContract {
  const evidence: SignalEvidence[] = [
    { key: "simulated_outcome", value: params.simulatedOutcome, source: "simulation", weight: 0.9 },
    { key: "probability_range_min", value: params.probabilityRange.min, source: "simulation", weight: 0.7 },
    { key: "probability_range_max", value: params.probabilityRange.max, source: "simulation", weight: 0.7 },
  ];

  const factors: SignalFactor[] = [
    { name: "base_probability", value: params.probability, weight: 0.8, explanation: params.reasoning },
    ...params.sensitivityFactors.map((sf) => ({
      name: `sensitivity_${sf.name}`,
      value: sf.impact,
      weight: 0.5,
      explanation: `${sf.name}: ${sf.impact}`,
    })),
  ];

  const risk: SignalRisk = {
    risk_level: params.riskLevel,
    warnings: params.assumptions.map((a) => `Assumption: ${a}`),
    failure_modes: params.failureModes,
  };

  const decisionBlock: SignalDecision = {
    recommendation: params.confidence >= 0.6 ? "Proceed with caution" : "Avoid — insufficient confidence",
    action: params.confidence >= 0.6 ? "review" : "wait",
    reason: params.reasoning,
  };

  return buildContract({
    domain: "simulation",
    toolName,
    outcomeLabel: params.label,
    confidence: params.confidence,
    probability: params.probability,
    evidence,
    factors,
    risk,
    decision: decisionBlock,
    traceId: params.traceId,
  });
}

/* ── Factory: auto-detect source type ───────────────────── */

export type NormalizableInput =
  | { type: "domain_signal"; data: DomainSignal }
  | { type: "decision_output"; data: DecisionOutput }
  | { type: "prediction_result"; data: PredictionResult }
  | { type: "game_metrics"; data: GameMetrics }
  | { type: "simulation"; data: Parameters<typeof normalizeFromSimulation>[0] };

export function toSignalOutputContract(
  input: NormalizableInput,
  toolName: string,
  traceId?: string,
): SignalOutputContract {
  switch (input.type) {
    case "domain_signal":
      return normalizeFromDomainSignal(input.data, toolName, traceId);
    case "decision_output":
      return normalizeFromDecisionOutput(input.data, toolName, traceId);
    case "prediction_result":
      return normalizeFromPredictionResult(input.data, toolName, traceId);
    case "game_metrics":
      return normalizeFromGameMetrics(input.data, toolName, traceId);
    case "simulation":
      return normalizeFromSimulation(input.data, toolName);
  }
}

/* ── Shared builder ──────────────────────────────────────── */

interface BuildContractParams {
  domain: SignalDomain;
  toolName: string;
  outcomeLabel: string;
  confidence: number;
  probability?: number;
  evidence: SignalEvidence[];
  factors: SignalFactor[];
  risk: SignalRisk;
  decision: SignalDecision;
  traceId?: string;
}

function buildContract(params: BuildContractParams): SignalOutputContract {
  const timing: SignalTiming = {
    generated_at: new Date().toISOString(),
  };

  const audit: SignalAudit = {
    cost_guard_applied: false,
    reviewer_required: params.risk.risk_level === "HIGH" || params.risk.risk_level === "EXTREME",
    trace_id: params.traceId,
  };

  return {
    signal_id: generateSignalId(),
    domain: params.domain,
    tool_name: params.toolName,
    outcome: {
      label: params.outcomeLabel,
      confidence: params.confidence,
      ...(params.probability !== undefined ? { probability: params.probability } : {}),
    },
    evidence: params.evidence,
    factors: params.factors,
    timing,
    risk: params.risk,
    decision: params.decision,
    audit,
  };
}

/* ── Utility: safe recommendation-to-action (for error paths) ── */

export function inferAction(input: {
  recommendation?: string;
  confidence: number;
  riskLevel: string;
}): SignalAction {
  if (input.confidence < 0.2 || input.riskLevel === "EXTREME") return "avoid";
  if (input.confidence < 0.4 || input.riskLevel === "HIGH") return "wait";
  if (input.confidence < 0.6 || input.riskLevel === "MEDIUM") return "review";
  if (input.confidence >= 0.6) return "enter";
  return "unknown";
}

/**
 * Determine whether a signal requires external review (for cost guard integration).
 */
export function shouldRequireReview(signal: SignalOutputContract): boolean {
  return (
    signal.risk.risk_level === "HIGH" ||
    signal.risk.risk_level === "EXTREME" ||
    signal.audit.reviewer_required
  );
}
