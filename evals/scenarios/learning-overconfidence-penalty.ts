import { outputContainsAll } from "../metrics.js";
import type { EvalScenario } from "../metrics.js";

export const learningOverconfidencePenalty: EvalScenario = {
  id: "LRN-002",
  name: "Learning Overconfidence Penalty",
  description: "Learning — high confidence errors should be penalized more than low confidence errors",
  taskPrompt: "Compare two prediction scenarios: (A) I was 95% confident and lost, versus (B) I was 55% confident and lost. Use the predict tool for dice (target 4) to get a baseline prediction, then explain: (1) Which scenario gets a larger confidence penalty and why, (2) How streak bias suppression works when errors happen consecutively, (3) What the uncertainty widening factor does when prediction variance is high.",
  expectedOutputFields: ["probability", "confidence", "penalty"],
  expectedConfidenceRange: [0.0, 1.0],
  expectedLatencyMax: 30000,
  mode: "repl",
  validate(output: string) {
    const fieldCheck = outputContainsAll(output, this.expectedOutputFields);
    if (!fieldCheck.passed) return fieldCheck;

    const errors: string[] = [];
    const lower = output.toLowerCase();

    // Must identify that high confidence errors are penalized more
    if (!lower.includes("high") || !lower.includes("penal")) {
      if (!lower.includes("overconfidence") && !lower.includes("confidence penalty")) {
        errors.push("Should discuss overconfidence penalty");
      }
    }

    // Should mention streak bias or consecutive
    if (!lower.includes("streak") && !lower.includes("consecutive") && !lower.includes("diminishing")) {
      errors.push("Should discuss streak bias suppression");
    }

    // Should mention uncertainty or variance
    if (!lower.includes("uncertainty") && !lower.includes("variance") && !lower.includes("widening")) {
      errors.push("Should mention uncertainty widening");
    }

    return {
      passed: errors.length === 0,
      score: errors.length === 0 ? 1.0 : Math.max(0, 1.0 - errors.length * 0.2),
      errors,
    };
  },
};
