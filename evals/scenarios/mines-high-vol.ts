import { outputContainsAll } from "../metrics.js";
import type { EvalScenario } from "../metrics.js";

export const minesHighVol: EvalScenario = {
  id: "PRED-006",
  name: "Mines High Volatility Prediction",
  description: "Mines prediction with 5 mines and 3 picks — must show combinatorial probability, HIGH/EXTREME risk",
  taskPrompt: "Predict the mines outcome on a 5x5 grid with 5 mines and 3 planned picks",
  expectedOutputFields: ["mines", "probability", "grid", "risk", "combinatorial"],
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
      const hasIndependent = lower.includes("independent") || lower.includes("random");
      if (hasProb && hasRisk) {
        return { passed: true, score: 1.0, errors: [] };
      }
      return { passed: false, score: 0.5, errors: ["Output should discuss mines probability and risk"] };
    }

    try {
      const data = JSON.parse(jsonMatch[0]);
      const errors: string[] = [];

      const prob = data.probability ?? data.outcome?.probability;
      if (typeof prob !== "number") errors.push("probability must be a number");
      else if (prob < 0.3 || prob > 0.7) {
        errors.push(`probability should be ~0.496, got ${prob}`);
      }

      const rl = data.riskLevel ?? data.risk?.risk_level;
      if (rl && !["HIGH", "EXTREME"].includes(rl)) {
        errors.push(`riskLevel must be HIGH or EXTREME, got ${rl}`);
      }

      // Check independence disclaimer
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
