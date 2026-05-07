import { outputContainsAll } from "../metrics.js";
import type { EvalScenario } from "../metrics.js";

export const behaviorLossChasing: EvalScenario = {
  id: "BEH-001",
  name: "Behavior Loss Chasing",
  description: "Behavior — loss chasing pattern should trigger intervention",
  taskPrompt: "I've had 4 consecutive losses on dice bets targeting number 3. My bet sizes went from 20 to 25 to 30 to 40. Bankroll is 885 from 1000. Use the dice prediction tool (target 3) to check the probability. Then explain: (1) What behavioral pattern is this? (2) Why is increasing bets after losses dangerous? (3) What intervention level would a behavior engine recommend? (4) How should the decision engine respond?",
  expectedOutputFields: ["probability", "loss", "chasing", "intervention"],
  expectedConfidenceRange: [0.0, 1.0],
  expectedLatencyMax: 30000,
  mode: "repl",
  validate(output: string) {
    const fieldCheck = outputContainsAll(output, this.expectedOutputFields);
    if (!fieldCheck.passed) return fieldCheck;

    const errors: string[] = [];
    const lower = output.toLowerCase();

    // Must identify loss chasing pattern
    if (!lower.includes("loss") || !lower.includes("chasing")) {
      errors.push("Should identify loss chasing pattern");
    }

    // Must discuss bet size escalation
    if (!lower.includes("increase") && !lower.includes("escalat")) {
      errors.push("Should discuss bet size escalation");
    }

    // Must mention intervention or stop
    if (!lower.includes("stop") && !lower.includes("interven") && !lower.includes("break")) {
      errors.push("Should recommend intervention or stopping");
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
