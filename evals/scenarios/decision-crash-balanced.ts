import { outputContainsAll } from "../metrics.js";
import type { EvalScenario } from "../metrics.js";

export const decisionCrashBalanced: EvalScenario = {
  id: "DEC-002",
  name: "Crash Balanced Decision",
  description: "Crash game with balanced risk preference — must return structured decision with valid action and risk assessment",
  taskPrompt: "Give me a crash game decision. Bankroll is 500, bet 20, balanced risk. Target multiplier 2x.",
  expectedOutputFields: ["decision", "crash", "balanced", "multiplier", "bet"],
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

      if (data.domain && !["prediction", "decision", "simulation"].includes(data.domain)) {
        errors.push("domain must be prediction, decision, or simulation");
      }
      if (data.decision?.action && !["enter", "avoid", "review", "wait", "unknown"].includes(data.decision.action)) {
        errors.push(`Invalid decision.action: ${data.decision?.action}`);
      }
      if (!data.decision?.reason) errors.push("decision.reason is required");
      if (!data.risk?.warnings && !data.risk_warnings) errors.push("risk.warnings is required");
      if (!data.timing?.generated_at) errors.push("timing.generated_at is required");

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
