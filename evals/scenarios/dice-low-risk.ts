import { outputContainsAll } from "../metrics.js";
import type { EvalScenario } from "../metrics.js";

export const diceLowRisk: EvalScenario = {
  id: "PRED-003",
  name: "Dice Low Risk Prediction",
  description: "Single-number dice prediction — must show probability ~16.7%, LOW risk, independence disclaimer",
  taskPrompt: "Predict the outcome for a dice roll targeting number 3 with a single bet",
  expectedOutputFields: ["dice", "probability", "prediction", "risk", "independent"],
  expectedConfidenceRange: [0.0, 1.0],
  expectedLatencyMax: 15000,
  mode: "repl",
  validate(output: string) {
    const fieldCheck = outputContainsAll(output, this.expectedOutputFields);
    if (!fieldCheck.passed) return { passed: false, score: fieldCheck.score, errors: fieldCheck.errors };

    // Try to extract any JSON object
    const jsonMatch = output.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { passed: false, score: 0.5, errors: ["Output does not contain JSON data"] };
    }

    try {
      const data = JSON.parse(jsonMatch[0]);
      const errors: string[] = [];

      // Check probability at top-level or nested in outcome
      const prob = data.probability ?? data.outcome?.probability;
      if (typeof prob !== "number") errors.push("probability must be a number");
      else if (Math.abs(prob - 1 / 6) > 0.05) errors.push(`probability should be ~0.167, got ${prob}`);

      if (!data.reasoning && !data.decision?.reason) errors.push("reasoning or decision.reason is required");

      // Check for independence disclaimer
      const allText = JSON.stringify(data).toLowerCase();
      if (!allText.includes("independent")) errors.push("must mention independent events");

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
