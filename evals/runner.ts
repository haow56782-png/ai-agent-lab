/**
 * Evaluation runner — loads scenarios, executes them through the agent,
 * and reports scores.
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

const SCENARIOS: Record<string, EvalScenario> = {
  "prediction-basic": predictionBasic,
  "prediction-edge": predictionEdge,
  "ds-read": designSystemRead,
  "ds-generate": designSystemGenerate,
};

export async function runEval(name: string): Promise<EvalResult> {
  const scenario = name === "all" ? null : SCENARIOS[name];
  if (!scenario && name !== "all") {
    return {
      taskId: "N/A",
      name,
      passed: false,
      score: 0,
      latencyMs: 0,
      errors: [`Unknown scenario: ${name}. Available: ${Object.keys(SCENARIOS).join(", ")}, all`],
      outputSample: "",
      timestamp: new Date().toISOString(),
    };
  }

  if (name === "all") {
    // Run all scenarios and aggregate
    const results = await Promise.all(
      Object.keys(SCENARIOS).map((key) => runSingle(SCENARIOS[key]!)),
    );

    const avgScore =
      results.reduce((sum, r) => sum + r.score, 0) / results.length;
    const allPassed = results.every((r) => r.passed);

    console.log(`\n=== Full Eval Results ===`);
    console.log(`Scenarios: ${results.length}`);
    console.log(`Passed: ${results.filter((r) => r.passed).length}/${results.length}`);
    console.log(`Avg Score: ${(avgScore * 100).toFixed(1)}%`);
    console.log(`Total Latency: ${results.reduce((s, r) => s + r.latencyMs, 0)}ms`);

    for (const r of results) {
      const icon = r.passed ? "✅" : "❌";
      console.log(`  ${icon} ${r.name} — score: ${(r.score * 100).toFixed(0)}%, ${r.latencyMs}ms`);
      if (r.errors.length > 0) {
        console.log(`     errors: ${r.errors.join("; ")}`);
      }
    }

    return {
      taskId: "ALL",
      name: "all",
      passed: allPassed,
      score: avgScore,
      latencyMs: results.reduce((s, r) => s + r.latencyMs, 0),
      errors: results.flatMap((r) => r.errors),
      outputSample: JSON.stringify(results.map((r) => ({ name: r.name, score: r.score, passed: r.passed }))),
      timestamp: new Date().toISOString(),
    };
  }

  // scenario is non-null here (null case handled above)
  return runSingle(scenario!);
}

async function runSingle(scenario: EvalScenario): Promise<EvalResult> {
  const start = performance.now();
  const agent = createAgent();

  let output: string;
  try {
    output = await agent.run(scenario.taskPrompt);
  } catch (err) {
    return recordMetrics({
      taskId: scenario.id,
      name: scenario.name,
      passed: false,
      score: 0,
      latencyMs: Math.round(performance.now() - start),
      errors: [`Agent threw: ${err}`],
      outputSample: "",
      timestamp: new Date().toISOString(),
    });
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
  console.log(`   Output (truncated): ${result.outputSample.slice(0, 200)}...`);

  return result;
}
