import { outputContainsAll } from "../metrics.js";
import type { EvalScenario } from "../metrics.js";

export const debateAgentDisagreement: EvalScenario = {
  id: "DEB-004",
  name: "Debate Agent Disagreement",
  description: "Debate — when Probability Analyst SUPPORTs but Risk Manager OPPOSEs, Arbiter must resolve",
  taskPrompt: "I'm considering a mines game (5x5 grid, 3 mines, 2 picks) with a 2000 bankroll, 200 bet, aggressive risk. Use the mines prediction tool (5 mines, 3 picks) and the decision tool (mines, bankroll 2000, bet 200, aggressive). Then role-play a multi-agent debate: (1) Why might the Probability Analyst SUPPORT this bet? (2) Why might the Risk Manager OPPOSE due to the bet being 10% of bankroll? (3) How should the Arbiter resolve this disagreement? (4) What's the final verdict?",
  expectedOutputFields: ["probability", "confidence", "oppose", "support", "arbiter"],
  expectedConfidenceRange: [0.0, 1.0],
  expectedLatencyMax: 30000,
  mode: "repl",
  validate(output: string) {
    const fieldCheck = outputContainsAll(output, this.expectedOutputFields);
    if (!fieldCheck.passed) return fieldCheck;

    const errors: string[] = [];
    const lower = output.toLowerCase();

    // Must discuss disagreement between agents
    if (!lower.includes("disagree") && !lower.includes("conflict") && !lower.includes("debate")) {
      errors.push("Should discuss agent disagreement");
    }

    // Must mention arbiter role
    if (!lower.includes("arbiter") && !lower.includes("final") && !lower.includes("verdict")) {
      errors.push("Should mention arbiter or final decision");
    }

    // Must discuss both sides
    if (!lower.includes("support") || !lower.includes("oppose")) {
      errors.push("Should discuss both SUPPORT and OPPOSE perspectives");
    }

    return {
      passed: errors.length === 0,
      score: errors.length === 0 ? 1.0 : Math.max(0, 1.0 - errors.length * 0.2),
      errors,
    };
  },
};
