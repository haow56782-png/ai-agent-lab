import { outputContainsAll } from "../metrics.js";
import type { EvalScenario } from "../metrics.js";

export const learningCorrectStreak: EvalScenario = {
  id: "LRN-001",
  name: "Learning Correct Streak",
  description: "Learning — confidence should increase after a streak of correct predictions",
  taskPrompt: "I've made 5 correct dice predictions in a row with target number 3. Use the dice prediction tool to check the probability for a single number (target 3), then explain how a Bayesian learning system would adjust confidence after this winning streak. Cover: overconfidence penalty, calibration, and why past results don't change the underlying probability.",
  expectedOutputFields: ["probability", "confidence", "calibration"],
  expectedConfidenceRange: [0.0, 1.0],
  expectedLatencyMax: 30000,
  mode: "repl",
  validate(output: string) {
    const fieldCheck = outputContainsAll(output, this.expectedOutputFields);
    if (!fieldCheck.passed) return fieldCheck;

    const errors: string[] = [];
    const lower = output.toLowerCase();

    // Must not claim probability changes after streak
    if (lower.includes("probability increase") || lower.includes("higher probability now")) {
      errors.push("Should not claim dice probability changes after a streak");
    }

    // Should mention confidence adjustment
    if (!lower.includes("confidence") && !lower.includes("bayesian")) {
      errors.push("Should discuss confidence or Bayesian adjustment");
    }

    // Must contain calibration concept
    if (!lower.includes("calibrat")) {
      errors.push("Should mention calibration");
    }

    // Should acknowledge independent events
    if (!lower.includes("independent") && !lower.includes("past result")) {
      errors.push("Should acknowledge dice outcomes are independent events");
    }

    return {
      passed: errors.length === 0,
      score: errors.length === 0 ? 1.0 : Math.max(0, 1.0 - errors.length * 0.2),
      errors,
    };
  },
};
