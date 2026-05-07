import { outputContainsAll } from "../metrics.js";
import type { EvalScenario } from "../metrics.js";

export const crashConservative: EvalScenario = {
  id: "PRED-005",
  name: "Crash Conservative Prediction",
  description: "Low-multiplier crash prediction — must show probability >= 0.5, HIGH/EXTREME risk, variance warnings",
  taskPrompt: "Predict the crash outcome for a 1.5x multiplier target",
  expectedOutputFields: ["crash", "probability", "multiplier", "risk", "variance"],
  expectedConfidenceRange: [0.0, 1.0],
  expectedLatencyMax: 15000,
  mode: "repl",
  validate(output: string) {
    const fieldCheck = outputContainsAll(output, this.expectedOutputFields);
    if (!fieldCheck.passed) return { passed: false, score: fieldCheck.score, errors: fieldCheck.errors };

    // Try to extract any JSON object
    const jsonMatch = output.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      const lower = output.toLowerCase();
      const hasProb = lower.includes("probability") || lower.includes("chance");
      const hasRisk = lower.includes("high") || lower.includes("extreme") || lower.includes("risk");
      const hasVariance = lower.includes("variance") || lower.includes("volatility");
      if (hasProb && hasRisk && hasVariance) {
        return { passed: true, score: 1.0, errors: [] };
      }
      return { passed: false, score: 0.5, errors: ["Output should discuss crash probability and risk"] };
    }

    try {
      const data = JSON.parse(jsonMatch[0]);
      const errors: string[] = [];

      const prob = data.probability ?? data.outcome?.probability;
      if (typeof prob !== "number") errors.push("probability must be a number");
      else if (prob < 0.5) errors.push(`probability should be >= 0.5 for 1.5x, got ${prob}`);

      const rl = data.riskLevel ?? data.risk?.risk_level;
      if (rl && !["HIGH", "EXTREME"].includes(rl)) {
        errors.push(`riskLevel must be HIGH or EXTREME, got ${rl}`);
      }

      // Check for variance
      const allText = JSON.stringify(data).toLowerCase();
      if (!allText.includes("variance") && !allText.includes("volatility")) {
        errors.push("must mention variance or volatility");
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
