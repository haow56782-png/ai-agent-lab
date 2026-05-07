import { outputContainsAll } from "../metrics.js";
import type { EvalScenario } from "../metrics.js";

export const debateNegativeEV: EvalScenario = {
  id: "DEB-001",
  name: "Debate Negative EV",
  description: "Debate — Probability Analyst should oppose negative expected value strategies",
  taskPrompt: "I want to bet on dice targeting a single number (target 3). Use the dice prediction tool to get the probability and expected value, then use the decision tool (bankroll 1000, bet 20, balanced risk). After getting both results, explain: (1) What a Probability Analyst in a multi-agent debate would say about this bet's expected value, (2) whether they would SUPPORT, OPPOSE, or issue CAUTION, and (3) why negative EV matters for long-term bankroll health.",
  expectedOutputFields: ["probability", "expectedValue", "oppose", "negative"],
  expectedConfidenceRange: [0.0, 1.0],
  expectedLatencyMax: 30000,
  mode: "repl",
  validate(output: string) {
    const fieldCheck = outputContainsAll(output, this.expectedOutputFields);
    if (!fieldCheck.passed) return fieldCheck;

    const errors: string[] = [];
    const lower = output.toLowerCase();

    // Must mention expected value being negative
    if (!lower.includes("expected value") && !lower.includes("ev")) {
      errors.push("Should discuss expected value");
    }

    // Must discuss long-term impact
    if (!lower.includes("long") && !lower.includes("long-term") && !lower.includes("long term")) {
      errors.push("Should discuss long-term implications of negative EV");
    }

    // Must not claim guaranteed wins
    for (const word of ["guaranteed", "certain win", "sure profit"]) {
      if (lower.includes(word)) {
        errors.push(`Contains forbidden language: ${word}`);
      }
    }

    return {
      passed: errors.length === 0,
      score: errors.length === 0 ? 1.0 : Math.max(0, 1.0 - errors.length * 0.2),
      errors,
    };
  },
};
