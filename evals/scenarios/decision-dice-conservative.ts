import { outputContainsAll } from "../metrics.js";
import type { EvalScenario } from "../metrics.js";

export const decisionDiceConservative: EvalScenario = {
  id: "DEC-001",
  name: "Dice Conservative Decision",
  description: "Dice game with conservative risk preference — must return structured decision with outcome, risk, and decision blocks",
  taskPrompt: "I want to play dice with a conservative strategy. My bankroll is 1000 and I want to bet 10 per roll. Give me a game decision.",
  expectedOutputFields: ["decision", "dice", "conservative", "bankroll", "play"],
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

      // Validate contract structure — check nested paths
      if (!data.signal_id) errors.push("signal_id is required");
      if (data.domain && !["prediction", "decision", "simulation"].includes(data.domain)) {
        errors.push("domain must be prediction, decision, or simulation");
      }
      if (data.decision?.action && !["enter", "avoid", "review", "wait", "unknown"].includes(data.decision.action)) {
        errors.push(`Invalid decision.action: ${data.decision?.action}`);
      }

      const conf = data.outcome?.confidence ?? data.confidence;
      if (typeof conf !== "number" || conf < 0 || conf > 1) {
        errors.push("confidence must be 0.0–1.0");
      }

      if (!data.decision?.reason) errors.push("decision.reason is required");

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
