import { outputContainsAll } from "../metrics.js";
import type { EvalScenario } from "../metrics.js";

export const learningReplayDeterministic: EvalScenario = {
  id: "LRN-005",
  name: "Learning Replay Deterministic",
  description: "Learning — same sequence of records should produce identical calibration metrics (deterministic replay)",
  taskPrompt: "I want to verify that my prediction history system is deterministic. Use the dice prediction tool (target 5) first. Then explain: (1) Why an append-only immutable record store is important for learning integrity, (2) How timestamp ordering ensures deterministic replay, (3) Why duplicate predictionIds should be rejected, (4) How deterministic replay allows reproducible calibration metrics. Also explain why the same sequence of game outcomes always produces the same Brier score and rolling accuracy.",
  expectedOutputFields: ["probability", "confidence", "deterministic", "replay"],
  expectedConfidenceRange: [0.0, 1.0],
  expectedLatencyMax: 30000,
  mode: "repl",
  validate(output: string) {
    const fieldCheck = outputContainsAll(output, this.expectedOutputFields);
    if (!fieldCheck.passed) return fieldCheck;

    const errors: string[] = [];
    const lower = output.toLowerCase();

    // Must discuss determinism
    if (!lower.includes("determin") && !lower.includes("reproducib")) {
      errors.push("Should discuss determinism or reproducibility");
    }

    // Must mention append-only or immutability
    if (!lower.includes("append") && !lower.includes("immutable") && !lower.includes("read-only")) {
      errors.push("Should mention append-only or immutable storage");
    }

    // Should mention timestamp ordering
    if (!lower.includes("timestamp") && !lower.includes("order")) {
      errors.push("Should mention timestamp ordering");
    }

    // Should mention duplicate prevention
    if (!lower.includes("duplicate") && !lower.includes("unique") && !lower.includes("id")) {
      errors.push("Should mention duplicate prevention");
    }

    return {
      passed: errors.length === 0,
      score: errors.length === 0 ? 1.0 : Math.max(0, 1.0 - errors.length * 0.2),
      errors,
    };
  },
};
