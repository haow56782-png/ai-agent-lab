import { outputContainsAll } from "../metrics.js";
import type { EvalScenario } from "../metrics.js";

export const behaviorFatigueRisk: EvalScenario = {
  id: "BEH-002",
  name: "Behavior Fatigue Risk",
  description: "Behavior — extended session should trigger fatigue detection",
  taskPrompt: "I've been playing crash games for 3 hours straight. I've placed about 80 bets. Use the crash prediction tool (target 2.0x) to get the probability. Then analyze: (1) How does session fatigue affect decision-making quality? (2) What is the recommended maximum session length? (3) What behavior state and intervention would a behavior engine assign? (4) What's the risk of continuing?",
  expectedOutputFields: ["probability", "fatigue", "session", "risk"],
  expectedConfidenceRange: [0.0, 1.0],
  expectedLatencyMax: 30000,
  mode: "repl",
  validate(output: string) {
    const fieldCheck = outputContainsAll(output, this.expectedOutputFields);
    if (!fieldCheck.passed) return fieldCheck;

    const errors: string[] = [];
    const lower = output.toLowerCase();

    // Must identify fatigue
    if (!lower.includes("fatigue") && !lower.includes("tired") && !lower.includes("extended")) {
      errors.push("Should identify session fatigue");
    }

    // Must discuss impaired judgment
    if (!lower.includes("judgment") && !lower.includes("decision") && !lower.includes("impair")) {
      errors.push("Should discuss how fatigue impacts judgment");
    }

    // Must recommend action
    if (!lower.includes("break") && !lower.includes("stop") && !lower.includes("rest")) {
      errors.push("Should recommend taking a break or stopping");
    }

    return {
      passed: errors.length === 0,
      score: errors.length === 0 ? 1.0 : Math.max(0, 1.0 - errors.length * 0.2),
      errors,
    };
  },
};
