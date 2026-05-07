import { outputContainsAll } from "../metrics.js";
import type { EvalScenario } from "../metrics.js";

export const graphLearningDrift: EvalScenario = {
  id: "GRF-004",
  name: "Graph Learning Drift",
  description: "Knowledge Graph — learning drift and strategy degradation should be connected in the graph",
  taskPrompt: "A player's learning engine detects: Strategy 'high-risk-momentum' has calibrated confidence 0.85 but Brier score 0.22 and accuracy of 0.35. The learning engine produces a calibration signal and marks the strategy as degraded. Explain: (1) How would a knowledge graph represent the learning calibration signal as LEARNING_SIGNAL nodes and UPDATED_CONFIDENCE edges? (2) How would DEGRADED_STRATEGY edges connect learning signals to strategy nodes? (3) What would the LEARNING_DRIFT_DOWNGRADE query find? (4) How does this help the debate engine evaluate strategy recommendations?",
  expectedOutputFields: ["drift", "calibrat", "degrad", "graph", "signal"],
  expectedConfidenceRange: [0.0, 1.0],
  expectedLatencyMax: 30000,
  mode: "repl",
  validate(output: string) {
    const fieldCheck = outputContainsAll(output, this.expectedOutputFields);
    if (!fieldCheck.passed) return fieldCheck;

    const errors: string[] = [];
    const lower = output.toLowerCase();

    if (!lower.includes("overconfidence") && !lower.includes("drift") && !lower.includes("calibrat")) {
      errors.push("Should discuss overconfidence or calibration drift");
    }

    if (!lower.includes("degrad")) {
      errors.push("Should discuss strategy degradation");
    }

    if (!lower.includes("debate")) {
      errors.push("Should mention how this feeds the debate engine");
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
