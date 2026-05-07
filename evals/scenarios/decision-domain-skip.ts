import { outputContainsAll } from "../metrics.js";
import type { EvalScenario } from "../metrics.js";

export const decisionDomainSkip: EvalScenario = {
  id: "DEC-005",
  name: "Domain Skip Decision",
  description: "Domain signal recommends SKIP — decision engine must not force PLAY (enter)",
  taskPrompt: "I want to play dice targeting number 3. Bankroll 500, bet 25, balanced risk. Give me a game decision.",
  expectedOutputFields: ["decision", "dice", "skip", "risk", "bet"],
  expectedConfidenceRange: [0.0, 1.0],
  expectedLatencyMax: 15000,
  mode: "repl",
  validate(output: string) {
    const fieldCheck = outputContainsAll(output, this.expectedOutputFields);
    if (!fieldCheck.passed) return { passed: false, score: fieldCheck.score, errors: fieldCheck.errors };

    // Try to extract any JSON object
    const jsonMatch = output.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // Narrative fallback — check for skip/caution
      const lower = output.toLowerCase();
      const skips = lower.includes("skip") || lower.includes("avoid") || lower.includes("caution") ||
        lower.includes("not recommend") || lower.includes("negative");
      if (skips) return { passed: true, score: 1.0, errors: [] };
      return { passed: false, score: 0.5, errors: ["Output should recommend skip for single-number dice"] };
    }

    try {
      const data = JSON.parse(jsonMatch[0]);
      const errors: string[] = [];

      // Domain signal for single-number dice is SKIP (negative EV)
      if (data.decision?.action === "enter") {
        errors.push("Decision should not be PLAY/enter when domain signal recommends SKIP");
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
