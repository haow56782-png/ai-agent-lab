import { outputContainsAll } from "../metrics.js";
import type { EvalScenario } from "../metrics.js";

export const predictionBasic: EvalScenario = {
  id: "PRED-001",
  name: "Basic Game Prediction",
  description: "Quick prediction for a known game — must return structured result",
  taskPrompt: "Predict the outcome for Gemini game, quick mode",
  expectedOutputFields: ["game", "prediction", "confidence", "factors", "timestamp"],
  expectedConfidenceRange: [0.0, 1.0],
  expectedLatencyMax: 15000,
  mode: "repl",
  validate(output: string) {
    const fieldCheck = outputContainsAll(output, this.expectedOutputFields);
    if (!fieldCheck.passed) return fieldCheck;

    // Check JSON format (may be inside markdown code block)
    const jsonMatch = output.match(/\{[\s\S]*"game"[\s\S]*\}/);
    if (!jsonMatch) {
      return { passed: false, score: 0.5, errors: ["Output is not valid JSON"] };
    }

    try {
      const data = JSON.parse(jsonMatch[0]);
      const errors: string[] = [];

      if (typeof data.confidence !== "number" || data.confidence < 0 || data.confidence > 1) {
        errors.push("confidence must be 0.0–1.0");
      }
      if (!Array.isArray(data.factors) || data.factors.length < 1) {
        errors.push("factors must be a non-empty array");
      }

      return {
        passed: errors.length === 0,
        score: errors.length === 0 ? 1.0 : 0.5,
        errors,
      };
    } catch {
      return { passed: false, score: 0.3, errors: ["Failed to parse JSON output"] };
    }
  },
};
