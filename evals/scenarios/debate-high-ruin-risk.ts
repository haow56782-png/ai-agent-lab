import { outputContainsAll } from "../metrics.js";
import type { EvalScenario } from "../metrics.js";

export const debateHighRuinRisk: EvalScenario = {
  id: "DEB-002",
  name: "Debate High Ruin Risk",
  description: "Debate — Risk Manager should oppose strategies with high ruin probability",
  taskPrompt: "I'm considering an aggressive crash strategy targeting 5.0x multiplier with a 500 bankroll and 50 bet size. Use the crash prediction tool (target 5.0x) and the decision tool (crash, bankroll 500, bet 50, aggressive). Then analyze from a Risk Manager's perspective: (1) What is the ruin probability concern? (2) Would the Risk Manager SUPPORT, OPPOSE, or CAUTION? (3) What bankroll exposure issues exist? (4) What risk level is appropriate?",
  expectedOutputFields: ["probability", "risk", "ruin", "oppose"],
  expectedConfidenceRange: [0.0, 1.0],
  expectedLatencyMax: 30000,
  mode: "repl",
  validate(output: string) {
    const fieldCheck = outputContainsAll(output, this.expectedOutputFields);
    if (!fieldCheck.passed) return fieldCheck;

    const errors: string[] = [];
    const lower = output.toLowerCase();

    // Must mention risk management
    if (!lower.includes("risk") || !lower.includes("bankroll")) {
      errors.push("Should discuss risk and bankroll");
    }

    // Must discuss exposure or bet size concerns
    if (!lower.includes("exposure") && !lower.includes("bet size") && !lower.includes("position size")) {
      errors.push("Should discuss bankroll exposure");
    }

    // Must not claim guaranteed wins
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
