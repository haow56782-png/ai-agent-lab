import { outputContainsAll } from "../metrics.js";
import type { EvalScenario } from "../metrics.js";

export const learningConfidenceCalibration: EvalScenario = {
  id: "LRN-003",
  name: "Learning Confidence Calibration",
  description: "Learning — calibration metrics (Brier score, rolling accuracy) should inform confidence adjustment",
  taskPrompt: "I need to evaluate how well-calibrated my game predictions are. Use the mines prediction tool (5 mines, 3 picks on a 5x5 grid) to get the probability and confidence. Then explain: (1) What a Brier score measures and what a good score looks like, (2) How rolling accuracy tracks recent performance, (3) How calibration buckets group predictions by confidence level, (4) How confidence drift is detected. Give me a practical example using the mines prediction data.",
  expectedOutputFields: ["probability", "confidence", "brier", "accuracy"],
  expectedConfidenceRange: [0.0, 1.0],
  expectedLatencyMax: 30000,
  mode: "repl",
  validate(output: string) {
    const fieldCheck = outputContainsAll(output, this.expectedOutputFields);
    if (!fieldCheck.passed) return fieldCheck;

    const errors: string[] = [];
    const lower = output.toLowerCase();

    // Must mention Brier score meaning
    if (!lower.includes("brier")) {
      errors.push("Should mention Brier score");
    }

    // Must mention rolling accuracy or recent performance
    if (!lower.includes("rolling") && !lower.includes("recent")) {
      errors.push("Should discuss rolling accuracy");
    }

    // Should mention calibration buckets or groups
    if (!lower.includes("bucket") && !lower.includes("group") && !lower.includes("decile")) {
      errors.push("Should mention calibration buckets");
    }

    // Should mention drift
    if (!lower.includes("drift")) {
      errors.push("Should mention confidence drift");
    }

    return {
      passed: errors.length === 0,
      score: errors.length === 0 ? 1.0 : Math.max(0, 1.0 - errors.length * 0.2),
      errors,
    };
  },
};
