import { outputContainsAll } from "../metrics.js";
import type { EvalScenario } from "../metrics.js";

export const predictionEdge: EvalScenario = {
  id: "PRED-002",
  name: "Edge Cases — Empty Game Name",
  description: "Agent should handle empty/missing game name gracefully",
  taskPrompt: "Predict the outcome for ",
  expectedOutputFields: ["error", "unknown"],
  mode: "repl",
  validate(output: string) {
    const fieldCheck = outputContainsAll(output, this.expectedOutputFields);
    if (fieldCheck.passed) {
      return { passed: true, score: 1.0, errors: [] };
    }

    // Also acceptable: agent asks for clarification
    const asksQuestion =
      output.toLowerCase().includes("which") ||
      output.toLowerCase().includes("please specify") ||
      output.toLowerCase().includes("game name");

    return {
      passed: asksQuestion,
      score: asksQuestion ? 0.8 : 0,
      errors: asksQuestion
        ? []
        : ["Expected error/unknown in output or a clarifying question"],
    };
  },
};
