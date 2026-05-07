import { outputContainsAll } from "../metrics.js";
import type { EvalScenario } from "../metrics.js";

export const behaviorDecisionDowngrade: EvalScenario = {
  id: "BEH-005",
  name: "Behavior Decision Downgrade",
  description: "Behavior — behavior engine should trigger decision downgrade in high-risk situations",
  taskPrompt: "I'm on a 5-loss streak on crash, increasing my bet from 20 to 50 each time. Bankroll went from 1000 to 750. I've been playing for 2 hours. Use the crash prediction tool (target 2.0x) and decision tool (crash, bankroll 750, bet 50, balanced). Then do a complete behavior analysis: (1) What behavior state am I in? (2) What intervention level is appropriate? (3) How should this feed into the decision engine to downgrade my action? (4) Walk through: original decision → behavior analysis → final downgraded decision.",
  expectedOutputFields: ["probability", "behavior", "downgrade", "stop", "intervention"],
  expectedConfidenceRange: [0.0, 1.0],
  expectedLatencyMax: 30000,
  mode: "repl",
  validate(output: string) {
    const fieldCheck = outputContainsAll(output, this.expectedOutputFields);
    if (!fieldCheck.passed) return fieldCheck;

    const errors: string[] = [];
    const lower = output.toLowerCase();

    // Must discuss behavior analysis
    if (!lower.includes("behavior") || !lower.includes("state")) {
      errors.push("Should discuss behavior state");
    }

    // Must discuss decision change
    if (!lower.includes("downgrade") && !lower.includes("reduce") && !lower.includes("skip") && !lower.includes("stop")) {
      errors.push("Should discuss decision downgrade");
    }

    // Must mention multiple factors (losses + duration + escalation)
    const factors = ["loss", "duration", "increas"];
    const foundFactors = factors.filter((f) => lower.includes(f));
    if (foundFactors.length < 2) {
      errors.push("Should consider multiple behavioral factors");
    }

    return {
      passed: errors.length === 0,
      score: errors.length === 0 ? 1.0 : Math.max(0, 1.0 - errors.length * 0.2),
      errors,
    };
  },
};
