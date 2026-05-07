import { outputContainsAll } from "../metrics.js";
import type { EvalScenario } from "../metrics.js";

export const memoryRiskEscalation: EvalScenario = {
  id: "MRY-003",
  name: "Memory Risk Escalation",
  description: "Memory — risk escalation levels should reflect player's behavioral history",
  taskPrompt: "A player has 10 recorded sessions, with 4 stop_session events, 6 tilt_detected events across those sessions, and a bankroll discipline score of 0.25. Their risk score is 0.72. Explain: (1) What risk escalation level does this profile produce and why? (2) How does the memory system compute risk score from tilt frequency, discipline, and stop events? (3) What persistent warnings would be generated? (4) How should the decision engine respond to high risk escalation?",
  expectedOutputFields: ["risk", "escalat", "score", "tilt"],
  expectedConfidenceRange: [0.0, 1.0],
  expectedLatencyMax: 30000,
  mode: "repl",
  validate(output: string) {
    const fieldCheck = outputContainsAll(output, this.expectedOutputFields);
    if (!fieldCheck.passed) return fieldCheck;

    const errors: string[] = [];
    const lower = output.toLowerCase();

    // Must identify high/critical risk level
    if (!lower.includes("critical") && !lower.includes("high") && !lower.includes("elevated")) {
      errors.push("Should identify risk escalation level");
    }

    // Must discuss persistent warnings
    if (!lower.includes("persistent") && !lower.includes("warning")) {
      errors.push("Should discuss persistent warnings");
    }

    // Must mention decision engine response
    if (!lower.includes("decision") && !lower.includes("stop") && !lower.includes("constrain")) {
      errors.push("Should discuss how decision engine should respond");
    }

    // Should discuss bankroll discipline
    if (!lower.includes("discipline") && !lower.includes("bankroll")) {
      errors.push("Should discuss bankroll discipline");
    }

    for (const word of ["guaranteed", "certain win", "sure profit"]) {
      if (lower.includes(word)) errors.push(`Contains forbidden: ${word}`);
    }

    return {
      passed: errors.length === 0,
      score: errors.length === 0 ? 1.0 : Math.max(0, 1.0 - errors.length * 0.2),
      errors,
    };
  },
};
