import { outputContainsAll } from "../metrics.js";
import type { EvalScenario } from "../metrics.js";

export const debateLearningDrift: EvalScenario = {
  id: "DEB-003",
  name: "Debate Learning Drift",
  description: "Debate — Learning Auditor should flag confidence drift and calibration issues",
  taskPrompt: "I've been making crash predictions with 85% confidence but only winning 40% of the time. Use the crash prediction tool (target 2.0x) to check the base probability. Then explain from a Learning Auditor's perspective: (1) What is the overconfidence problem here? (2) How would a Brier score detect this? (3) What is confidence drift and why is it dangerous? (4) What adjustments should the auditor recommend to the strategy?",
  expectedOutputFields: ["probability", "confidence", "calibration", "drift"],
  expectedConfidenceRange: [0.0, 1.0],
  expectedLatencyMax: 30000,
  mode: "repl",
  validate(output: string) {
    const fieldCheck = outputContainsAll(output, this.expectedOutputFields);
    if (!fieldCheck.passed) return fieldCheck;

    const errors: string[] = [];
    const lower = output.toLowerCase();

    // Must discuss overconfidence
    if (!lower.includes("overconfidence") && !lower.includes("over-confiden") && !lower.includes("too confident")) {
      errors.push("Should discuss overconfidence problem");
    }

    // Must mention Brier score
    if (!lower.includes("brier")) {
      errors.push("Should mention Brier score for calibration");
    }

    // Must discuss adjustments
    if (!lower.includes("adjust") && !lower.includes("reduc")) {
      errors.push("Should recommend adjustments to confidence");
    }

    return {
      passed: errors.length === 0,
      score: errors.length === 0 ? 1.0 : Math.max(0, 1.0 - errors.length * 0.2),
      errors,
    };
  },
};
