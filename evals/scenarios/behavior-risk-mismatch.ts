import { outputContainsAll } from "../metrics.js";
import type { EvalScenario } from "../metrics.js";

export const behaviorRiskMismatch: EvalScenario = {
  id: "BEH-004",
  name: "Behavior Risk Mismatch",
  description: "Behavior — conservative user making large bets should trigger mismatch warning",
  taskPrompt: "I set my risk preference to conservative but I've been betting 100 per round on mines (5x5, 3 mines, 3 picks) with a 1000 bankroll. Use the mines prediction tool (5 mines, 3 picks) and decision tool (mines, conservative, 1000 bankroll, 100 bet). Then analyze: (1) Why is 100 (10% of bankroll) incompatible with conservative risk preference? (2) What risk mismatch would a behavior engine detect? (3) What intervention is needed? (4) How should the system respond?",
  expectedOutputFields: ["probability", "risk", "mismatch", "conservative"],
  expectedConfidenceRange: [0.0, 1.0],
  expectedLatencyMax: 30000,
  mode: "repl",
  validate(output: string) {
    const fieldCheck = outputContainsAll(output, this.expectedOutputFields);
    if (!fieldCheck.passed) return fieldCheck;

    const errors: string[] = [];
    const lower = output.toLowerCase();

    // Must identify mismatch
    if (!lower.includes("mismatch") && !lower.includes("inconsisten") && !lower.includes("conflict")) {
      errors.push("Should identify risk preference mismatch");
    }

    // Must discuss conservative limits
    if (!lower.includes("conservative") && !lower.includes("limit")) {
      errors.push("Should discuss conservative risk limits");
    }

    // Must mention bankroll percentage
    if (!lower.includes("%") && !lower.includes("percent") && !lower.includes("bankroll")) {
      errors.push("Should discuss bankroll percentage");
    }

    return {
      passed: errors.length === 0,
      score: errors.length === 0 ? 1.0 : Math.max(0, 1.0 - errors.length * 0.2),
      errors,
    };
  },
};
