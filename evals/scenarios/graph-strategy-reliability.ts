import { outputContainsAll } from "../metrics.js";
import type { EvalScenario } from "../metrics.js";

export const graphStrategyReliability: EvalScenario = {
  id: "GRF-002",
  name: "Graph Strategy Reliability",
  description: "Knowledge Graph — strategy reliability should be derivable from graph edges",
  taskPrompt: "A player has used 3 strategies: 'low-volatility-farming' (12 times, 8 wins), 'medium-risk-balanced' (8 times, 4 wins), 'high-risk-momentum' (5 times, 1 win). One strategy has a degradation signal from the learning engine. Explain: (1) How would a knowledge graph track strategy usage through USED_STRATEGY edges? (2) How would STRATEGY_RELIABILITY compute win rate and detect degradation? (3) How would the graph represent a DEGRADED_STRATEGY relationship? (4) What constraints would the graph context generate for a degraded strategy?",
  expectedOutputFields: ["strategy", "reliability", "degrad", "graph"],
  expectedConfidenceRange: [0.0, 1.0],
  expectedLatencyMax: 30000,
  mode: "repl",
  validate(output: string) {
    const fieldCheck = outputContainsAll(output, this.expectedOutputFields);
    if (!fieldCheck.passed) return fieldCheck;

    const errors: string[] = [];
    const lower = output.toLowerCase();

    if (!lower.includes("used_strategy") && !lower.includes("edge")) {
      errors.push("Should discuss USED_STRATEGY edges");
    }

    if (!lower.includes("degrad")) {
      errors.push("Should discuss strategy degradation");
    }

    if (!lower.includes("constraint")) {
      errors.push("Should discuss constraints from degraded strategies");
    }

    for (const word of ["guaranteed", "certain win", "sure profit"]) {
      if (lower.includes(word)) errors.push(`Contains forbidden: ${word}`);
    }

    return {
      passed: errors.length === 0,
      score: errors.length === 0 ? 1.0 : Math.max(0, 1.0 - errors.length * 0.2),
      errors,
    };
  },
};
