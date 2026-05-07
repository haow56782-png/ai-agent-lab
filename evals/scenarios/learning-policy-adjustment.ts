import { outputContainsAll } from "../metrics.js";
import type { EvalScenario } from "../metrics.js";

export const learningPolicyAdjustment: EvalScenario = {
  id: "LRN-004",
  name: "Learning Policy Adjustment",
  description: "Learning — policy update should adjust bet fraction and confidence based on calibration",
  taskPrompt: "I've been playing crash with a conservative strategy targeting 2.0x multiplier. Use the crash prediction tool (target 2.0x) to get the probability. Then design a learning feedback loop: (1) How would the system adjust my bet size if my Brier score is 0.30 (poor calibration)? (2) How would it adjust if my Brier score is 0.08 (good calibration)? (3) What happens when confidence drifts up without accuracy improving? (4) How does risk preference (conservative vs. aggressive) affect the policy update?",
  expectedOutputFields: ["probability", "confidence", "bet", "risk"],
  expectedConfidenceRange: [0.0, 1.0],
  expectedLatencyMax: 30000,
  mode: "repl",
  validate(output: string) {
    const fieldCheck = outputContainsAll(output, this.expectedOutputFields);
    if (!fieldCheck.passed) return fieldCheck;

    const errors: string[] = [];
    const lower = output.toLowerCase();

    // Must discuss bet size adjustment
    if (!lower.includes("bet size") && !lower.includes("bet fraction") && !lower.includes("betting")) {
      errors.push("Should discuss bet size adjustment");
    }

    // Should mention calibration quality
    if (!lower.includes("poor") && !lower.includes("good") && !lower.includes("brier")) {
      if (!lower.includes("calibrat")) {
        errors.push("Should discuss calibration quality");
      }
    }

    // Should mention confidence drift
    if (!lower.includes("drift")) {
      errors.push("Should mention confidence drift");
    }

    // Should mention risk preference
    if (!lower.includes("conservative") && !lower.includes("aggressive") && !lower.includes("risk")) {
      errors.push("Should mention risk preference impact on policy");
    }

    return {
      passed: errors.length === 0,
      score: errors.length === 0 ? 1.0 : Math.max(0, 1.0 - errors.length * 0.2),
      errors,
    };
  },
};
