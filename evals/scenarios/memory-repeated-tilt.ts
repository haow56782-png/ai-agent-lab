import { outputContainsAll } from "../metrics.js";
import type { EvalScenario } from "../metrics.js";

export const memoryRepeatedTilt: EvalScenario = {
  id: "MRY-001",
  name: "Memory Repeated Tilt",
  description: "Memory — repeated tilt events should trigger risk escalation",
  taskPrompt: "A player has had tilt detected across 3 different sessions. In session 1 they had 1 tilt event, session 2 had 2 tilt events, session 3 had 3 tilt events. Explain: (1) How should a cross-session memory system track tilt propensity across sessions? (2) What risk escalation level would repeated tilt trigger? (3) How should the system warn about this pattern? (4) What persistent warnings would be generated?",
  expectedOutputFields: ["tilt", "risk", "escalat", "warning"],
  expectedConfidenceRange: [0.0, 1.0],
  expectedLatencyMax: 30000,
  mode: "repl",
  validate(output: string) {
    const fieldCheck = outputContainsAll(output, this.expectedOutputFields);
    if (!fieldCheck.passed) return fieldCheck;

    const errors: string[] = [];
    const lower = output.toLowerCase();

    // Must discuss cross-session tracking
    if (!lower.includes("cross-session") && !lower.includes("across session") && !lower.includes("track")) {
      errors.push("Should discuss cross-session tracking");
    }

    // Must mention risk escalation
    if (!lower.includes("escalat")) {
      errors.push("Should mention risk escalation");
    }

    // Must discuss persistent warnings
    if (!lower.includes("persistent") && !lower.includes("warning")) {
      errors.push("Should discuss persistent warnings");
    }

    // Should mention tilt propensity
    if (!lower.includes("propensity") && !lower.includes("frequency")) {
      errors.push("Should mention tilt propensity or frequency");
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
