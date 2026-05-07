/**
 * Evaluation runner — loads scenarios, executes them through the agent,
 * and reports scores with calibration analysis and baseline comparison.
 *
 * Usage:
 *   npm run dev eval prediction-basic
 *   npm run dev eval prediction-edge
 *   npm run dev eval all
 */

import { createAgent } from "../src/agent.js";
import { recordMetrics, type EvalResult } from "./metrics.js";
import type { EvalScenario } from "./metrics.js";
import { predictionBasic } from "./scenarios/prediction-basic.js";
import { predictionEdge } from "./scenarios/prediction-edge.js";
import { designSystemRead, designSystemGenerate } from "./scenarios/design-system.js";
import { diceLowRisk } from "./scenarios/dice-low-risk.js";
import { diceHighRisk } from "./scenarios/dice-high-risk.js";
import { crashConservative } from "./scenarios/crash-conservative.js";
import { minesHighVol } from "./scenarios/mines-high-vol.js";
import { predictionInvalid } from "./scenarios/prediction-invalid.js";
import { decisionDiceConservative } from "./scenarios/decision-dice-conservative.js";
import { decisionCrashBalanced } from "./scenarios/decision-crash-balanced.js";
import { decisionMinesAggressive } from "./scenarios/decision-mines-aggressive.js";
import { decisionBankrollStop } from "./scenarios/decision-bankroll-stop.js";
import { decisionDomainSkip } from "./scenarios/decision-domain-skip.js";
import { simulationDiceNegativeEV } from "./scenarios/simulation-dice-negative-ev.js";
import { simulationCrashHighVolatility } from "./scenarios/simulation-crash-high-volatility.js";
import { simulationMinesRuinRisk } from "./scenarios/simulation-mines-ruin-risk.js";
import { simulationSeedReproducibility } from "./scenarios/simulation-seed-reproducibility.js";
import { simulationInvalidInput } from "./scenarios/simulation-invalid-input.js";
import { learningCorrectStreak } from "./scenarios/learning-correct-streak.js";
import { learningOverconfidencePenalty } from "./scenarios/learning-overconfidence-penalty.js";
import { learningConfidenceCalibration } from "./scenarios/learning-confidence-calibration.js";
import { learningPolicyAdjustment } from "./scenarios/learning-policy-adjustment.js";
import { learningReplayDeterministic } from "./scenarios/learning-replay-deterministic.js";
import { debateNegativeEV } from "./scenarios/debate-negative-ev.js";
import { debateHighRuinRisk } from "./scenarios/debate-high-ruin-risk.js";
import { debateLearningDrift } from "./scenarios/debate-learning-drift.js";
import { debateAgentDisagreement } from "./scenarios/debate-agent-disagreement.js";
import { debateFinalArbiter } from "./scenarios/debate-final-arbiter.js";
import { behaviorLossChasing } from "./scenarios/behavior-loss-chasing.js";
import { behaviorFatigueRisk } from "./scenarios/behavior-fatigue-risk.js";
import { behaviorWinOverbet } from "./scenarios/behavior-win-overbet.js";
import { behaviorRiskMismatch } from "./scenarios/behavior-risk-mismatch.js";
import { behaviorDecisionDowngrade } from "./scenarios/behavior-decision-downgrade.js";
import { memoryRepeatedTilt } from "./scenarios/memory-repeated-tilt.js";
import { memorySessionSummary } from "./scenarios/memory-session-summary.js";
import { memoryRiskEscalation } from "./scenarios/memory-risk-escalation.js";
import { memoryStrategyAffinity } from "./scenarios/memory-strategy-affinity.js";
import { memoryCrossSessionLearning } from "./scenarios/memory-cross-session-learning.js";
import { graphPlayerRiskPatterns } from "./scenarios/graph-player-risk-patterns.js";
import { graphStrategyReliability } from "./scenarios/graph-strategy-reliability.js";
import { graphStopSessionPath } from "./scenarios/graph-stop-session-path.js";
import { graphLearningDrift } from "./scenarios/graph-learning-drift.js";
import { graphDebateObjections } from "./scenarios/graph-debate-objections.js";
import { computeCalibration, parseConfidenceFromOutput, formatCalibration } from "./calibration.js";
import { formatMetricLine, summarize, formatDistribution } from "./stats.js";
import { saveReport, compareBaseline, formatComparison } from "./reporter.js";

const SCENARIOS: Record<string, EvalScenario> = {
  "prediction-basic": predictionBasic,
  "prediction-edge": predictionEdge,
  "ds-read": designSystemRead,
  "ds-generate": designSystemGenerate,
  "dice-low-risk": diceLowRisk,
  "dice-high-risk": diceHighRisk,
  "crash-conservative": crashConservative,
  "mines-high-vol": minesHighVol,
  "prediction-invalid": predictionInvalid,
  "decision-dice-conservative": decisionDiceConservative,
  "decision-crash-balanced": decisionCrashBalanced,
  "decision-mines-aggressive": decisionMinesAggressive,
  "decision-bankroll-stop": decisionBankrollStop,
  "decision-domain-skip": decisionDomainSkip,
  "simulation-dice-negative-ev": simulationDiceNegativeEV,
  "simulation-crash-high-volatility": simulationCrashHighVolatility,
  "simulation-mines-ruin-risk": simulationMinesRuinRisk,
  "simulation-seed-reproducibility": simulationSeedReproducibility,
  "simulation-invalid-input": simulationInvalidInput,
  "learning-correct-streak": learningCorrectStreak,
  "learning-overconfidence-penalty": learningOverconfidencePenalty,
  "learning-confidence-calibration": learningConfidenceCalibration,
  "learning-policy-adjustment": learningPolicyAdjustment,
  "learning-replay-deterministic": learningReplayDeterministic,
  "debate-negative-ev": debateNegativeEV,
  "debate-high-ruin-risk": debateHighRuinRisk,
  "debate-learning-drift": debateLearningDrift,
  "debate-agent-disagreement": debateAgentDisagreement,
  "debate-final-arbiter": debateFinalArbiter,
  "behavior-loss-chasing": behaviorLossChasing,
  "behavior-fatigue-risk": behaviorFatigueRisk,
  "behavior-win-overbet": behaviorWinOverbet,
  "behavior-risk-mismatch": behaviorRiskMismatch,
  "behavior-decision-downgrade": behaviorDecisionDowngrade,
  "memory-repeated-tilt": memoryRepeatedTilt,
  "memory-session-summary": memorySessionSummary,
  "memory-risk-escalation": memoryRiskEscalation,
  "memory-strategy-affinity": memoryStrategyAffinity,
  "memory-cross-session-learning": memoryCrossSessionLearning,
  "graph-player-risk-patterns": graphPlayerRiskPatterns,
  "graph-strategy-reliability": graphStrategyReliability,
  "graph-stop-session-path": graphStopSessionPath,
  "graph-learning-drift": graphLearningDrift,
  "graph-debate-objections": graphDebateObjections,
};

export async function runEval(name: string): Promise<EvalResult[]> {
  if (name === "all") {
    return runAll();
  }

  const scenario = SCENARIOS[name];
  if (!scenario) {
    console.error(`Unknown scenario: ${name}. Available: ${Object.keys(SCENARIOS).join(", ")}, all`);
    return [{
      taskId: "N/A",
      name,
      passed: false,
      score: 0,
      latencyMs: 0,
      errors: [`Unknown scenario: ${name}`],
      outputSample: "",
      timestamp: new Date().toISOString(),
    }];
  }

  const result = await runSingle(scenario);
  await finishEval([result]);
  return [result];
}

async function runAll(): Promise<EvalResult[]> {
  console.log(`\nRunning all ${Object.keys(SCENARIOS).length} scenarios...\n`);

  const results = await Promise.all(
    Object.keys(SCENARIOS).map((key) => runSingle(SCENARIOS[key]!)),
  );

  await finishEval(results);
  return results;
}

async function finishEval(results: EvalResult[]) {
  if (results.length === 0) {
    console.log(`\nNo scenarios to evaluate.`);
    return;
  }

  // Aggregate stats
  const scores = results.map((r) => r.score);
  const latencies = results.map((r) => r.latencyMs);
  const passed = results.filter((r) => r.passed).length;

  console.log(`\n=== Full Eval Results ===`);
  console.log(`Scenarios: ${results.length}`);
  console.log(`Passed: ${passed}/${results.length}`);
  console.log(formatMetricLine("Pass rate", passed, results.length));

  const avgScore = scores.reduce((s, r) => s + r, 0) / scores.length;
  console.log(`Avg Score: ${(avgScore * 100).toFixed(1)}%`);
  console.log(formatDistribution("Latency", latencies));

  for (const r of results) {
    const icon = r.passed ? "✅" : "❌";
    console.log(`  ${icon} ${r.name} — score: ${(r.score * 100).toFixed(0)}%, ${r.latencyMs}ms`);
    if (r.errors.length > 0) {
      for (const e of r.errors) console.log(`     ${e}`);
    }
  }

  // Calibration analysis: only for prediction scenarios (ids starting with PRED)
  const predResults = results.filter((r) => r.taskId.startsWith("PRED"));
  const calPoints = predResults
    .map((r) => {
      const confidence = parseConfidenceFromOutput(r.outputSample);
      return confidence != null ? { predictedConfidence: confidence, actualOutcome: r.passed ? 1 : 0 } : null;
    })
    .filter((p): p is NonNullable<typeof p> => p != null);

  if (calPoints.length >= 3) {
    console.log();
    console.log(formatCalibration(computeCalibration(calPoints)));
  }

  // Save report and compare with baseline
  const report = await saveReport(results);
  console.log(`\nReport saved.`);

  const comparison = await compareBaseline(results);
  if (comparison) {
    console.log();
    console.log(formatComparison(comparison));
  }
}

async function runSingle(scenario: EvalScenario): Promise<EvalResult> {
  const start = performance.now();
  const agent = createAgent();

  let output: string;
  try {
    output = await agent.run(scenario.taskPrompt);
  } catch (err) {
    const result: EvalResult = recordMetrics({
      taskId: scenario.id,
      name: scenario.name,
      passed: false,
      score: 0,
      latencyMs: Math.round(performance.now() - start),
      errors: [`Agent threw: ${err}`],
      outputSample: "",
      timestamp: new Date().toISOString(),
    });

    const icon = "❌";
    console.log(`\n${icon} ${scenario.name}`);
    console.log(`   Score: 0%`);
    console.log(`   Error: Agent threw: ${err}`);

    return result;
  }

  const latencyMs = Math.round(performance.now() - start);
  const validation = scenario.validate(output);

  const result: EvalResult = recordMetrics({
    taskId: scenario.id,
    name: scenario.name,
    passed: validation.passed,
    score: validation.score,
    latencyMs,
    errors: validation.errors,
    outputSample: output.slice(0, 500),
    timestamp: new Date().toISOString(),
  });

  const icon = result.passed ? "✅" : "❌";
  console.log(`\n${icon} ${scenario.name}`);
  console.log(`   Score: ${(result.score * 100).toFixed(0)}%`);
  console.log(`   Latency: ${result.latencyMs}ms`);
  if (result.errors.length > 0) {
    console.log(`   Errors: ${result.errors.join("; ")}`);
  }

  return result;
}
