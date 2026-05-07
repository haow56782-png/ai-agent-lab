import { outputContainsAll } from "../metrics.js";
import type { EvalScenario } from "../metrics.js";

export const debateFinalArbiter: EvalScenario = {
  id: "DEB-005",
  name: "Debate Final Arbiter",
  description: "Debate — Final Arbiter synthesizes all agent reviews into a final decision with trace",
  taskPrompt: "I want a complete multi-agent debate analysis for a conservative dice strategy betting on number 6 with bankroll 1000, bet 10. Use the dice prediction tool (target 6) and the decision tool (dice, bankroll 1000, bet 10, conservative). Then walk through: (1) What each of the 4 agents (Probability Analyst, Risk Manager, Strategy Critic, Learning Auditor) would say, (2) Whether the Final Arbiter reaches UNANIMOUS, MAJORITY, SPLIT, or ARBITER_OVERRIDE consensus, (3) The final action with confidence adjustment, and (4) The decision trace showing each agent's stance and score.",
  expectedOutputFields: ["probability", "confidence", "arbiter", "consensus", "trace"],
  expectedConfidenceRange: [0.0, 1.0],
  expectedLatencyMax: 30000,
  mode: "repl",
  validate(output: string) {
    const fieldCheck = outputContainsAll(output, this.expectedOutputFields);
    if (!fieldCheck.passed) return fieldCheck;

    const errors: string[] = [];
    const lower = output.toLowerCase();

    // Must discuss multiple agents
    const agents = ["probability", "risk", "strategy", "learning"];
    const found = agents.filter((a) => lower.includes(a));
    if (found.length < 3) {
      errors.push(`Should discuss at least 3 of 4 debate agents (found: ${found.length})`);
    }

    // Must mention consensus or final decision
    if (!lower.includes("consensus") && !lower.includes("unanimous") && !lower.includes("majority") && !lower.includes("split") && !lower.includes("override")) {
      errors.push("Should mention consensus level");
    }

    // Must discuss final action
    if (!lower.includes("play") && !lower.includes("skip") && !lower.includes("reduce") && !lower.includes("stop")) {
      errors.push("Should mention final action");
    }

    // No forbidden language
    for (const word of ["guaranteed", "certain win", "sure profit"]) {
      if (lower.includes(word)) {
        errors.push(`Contains forbidden language: ${word}`);
      }
    }

    return {
      passed: errors.length === 0,
      score: errors.length === 0 ? 1.0 : Math.max(0, 1.0 - errors.length * 0.2),
      errors,
    };
  },
};
