/**
 * Load Test Scenario — runs N consecutive predictions and measures
 * success rate, latency distribution, and consistency.
 */

import type { EvalScenario } from "../metrics.js";
import { outputContainsAll } from "../metrics.js";

export const loadTest: EvalScenario = {
  id: "LOAD-001",
  name: "Load Test — 10 consecutive predictions",
  description: "Run 10 quick predictions in sequence to measure reliability and latency distribution",
  taskPrompt: "Predict the outcome for Gemini game, quick mode",
  expectedOutputFields: ["game", "prediction", "confidence"],
  mode: "repl",
  expectedLatencyMax: 30000, // per call
  validate(output: string) {
    return outputContainsAll(output, this.expectedOutputFields);
  },
};

export async function runLoadTest(): Promise<{
  total: number;
  passed: number;
  avgLatencyMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
}> {
  const { createAgent } = await import("../../src/agent.js");
  const agent = createAgent();
  const latencies: number[] = [];
  let passed = 0;

  for (let i = 0; i < 10; i++) {
    const start = performance.now();
    try {
      const result = await agent.run("Predict the outcome for Gemini game, quick mode");
      const hasFields = result.includes("prediction") && result.includes("confidence");
      if (hasFields) passed++;
    } catch {
      // failed
    }
    latencies.push(Math.round(performance.now() - start));
  }

  const sorted = [...latencies].sort((a, b) => a - b);
  const avg = (ms: number[]) => Math.round(ms.reduce((a, b) => a + b, 0) / ms.length);

  return {
    total: 10,
    passed,
    avgLatencyMs: avg(latencies),
    p50Ms: sorted[5]!,
    p95Ms: sorted[9]!,
    p99Ms: sorted[9]!,
  };
}
