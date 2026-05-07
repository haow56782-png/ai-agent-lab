import { outputContainsAll } from "../metrics.js";
import type { EvalScenario } from "../metrics.js";

export const decisionBankrollStop: EvalScenario = {
  id: "DEC-004",
  name: "Bankroll Stop Decision",
  description: "Bet size exceeds bankroll — must return stop/refuse decision with explanation",
  taskPrompt: "I want to play dice. My bankroll is only 30 but I want to bet 100 per roll. Balanced risk. Give me a game decision.",
  expectedOutputFields: ["decision", "bankroll", "stop", "exceed", "bet"],
  expectedConfidenceRange: [0.0, 1.0],
  expectedLatencyMax: 15000,
  mode: "repl",
  validate(output: string) {
    const fieldCheck = outputContainsAll(output, this.expectedOutputFields);
    if (!fieldCheck.passed) return { passed: false, score: fieldCheck.score, errors: fieldCheck.errors };

    // When bet exceeds bankroll, should NOT be PLAY
    const lower = output.toLowerCase();

    // Try to extract any JSON object
    const jsonMatch = output.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // Narrative fallback — check for refusal
      const refuses = lower.includes("can't") || lower.includes("cannot") || lower.includes("stop") ||
        lower.includes("refuse") || lower.includes("denied") || lower.includes("not possible");
      if (refuses) return { passed: true, score: 1.0, errors: [] };
      return { passed: false, score: 0.5, errors: ["Output should refuse bet that exceeds bankroll"] };
    }

    try {
      const data = JSON.parse(jsonMatch[0]);
      const errors: string[] = [];

      // Should NOT be "enter" (PLAY) when bet exceeds bankroll
      if (data.decision?.action === "enter") {
        errors.push("Decision should not be PLAY/enter when bet exceeds bankroll");
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
