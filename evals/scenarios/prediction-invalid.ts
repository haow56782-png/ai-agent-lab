import type { EvalScenario } from "../metrics.js";

export const predictionInvalid: EvalScenario = {
  id: "PRED-007",
  name: "Invalid Prediction Input",
  description: "Unknown game type with no parameters — must return error or clarification",
  taskPrompt: "Predict the outcome for game 'unknown' with no parameters",
  expectedOutputFields: [],
  expectedConfidenceRange: [0.0, 1.0],
  expectedLatencyMax: 15000,
  mode: "repl",
  validate(output: string) {
    const lower = output.toLowerCase();

    const errors: string[] = [];
    const errorIndicators = ["error", "unknown", "not supported", "clarify", "what do you mean", "i don't know", "can't", "unable", "invalid", "sorry"];

    const hasError = errorIndicators.some((indicator) => lower.includes(indicator));
    if (!hasError) {
      errors.push("output should indicate an error or clarification for unknown game type");
    }

    // Score: 1.0 if clearly an error response, lower if ambiguous
    const hasClearError = ["error", "unknown", "not supported", "invalid"].some((w) => lower.includes(w));

    return {
      passed: errors.length === 0,
      score: hasClearError ? 1.0 : hasError ? 0.5 : 0,
      errors,
    };
  },
};
