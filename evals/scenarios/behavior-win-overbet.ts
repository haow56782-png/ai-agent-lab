import { outputContainsAll } from "../metrics.js";
import type { EvalScenario } from "../metrics.js";

export const behaviorWinOverbet: EvalScenario = {
  id: "BEH-003",
  name: "Behavior Win Overbet",
  description: "Behavior — bet size increase after a win should trigger caution",
  taskPrompt: "I won a dice bet (target 4) with a 20 bet and got 39 back. Now I want to bet 50 on the next round because I'm feeling lucky. Use the dice prediction tool (target 4) to check the probability. Then analyze: (1) What behavioral pattern does increasing bet after a win indicate? (2) Why is 'feeling lucky' a dangerous mindset? (3) What would a behavior engine recommend? (4) How does this relate to overconfidence bias?",
  expectedOutputFields: ["probability", "overbet", "bias", "caution"],
  expectedConfidenceRange: [0.0, 1.0],
  expectedLatencyMax: 30000,
  mode: "repl",
  validate(output: string) {
    const fieldCheck = outputContainsAll(output, this.expectedOutputFields);
    if (!fieldCheck.passed) return fieldCheck;

    const errors: string[] = [];
    const lower = output.toLowerCase();

    // Must discuss overbet after win
    if (!lower.includes("overbet") && !lower.includes("increase") && !lower.includes("after a win")) {
      errors.push("Should discuss betting more after a win");
    }

    // Must discuss psychological bias
    if (!lower.includes("bias") && !lower.includes("overconfiden") && !lower.includes("lucky")) {
      errors.push("Should discuss psychological factors");
    }

    // Must mention caution
    if (!lower.includes("caution") && !lower.includes("careful") && !lower.includes("reduce")) {
      errors.push("Should advise caution");
    }

    return {
      passed: errors.length === 0,
      score: errors.length === 0 ? 1.0 : Math.max(0, 1.0 - errors.length * 0.2),
      errors,
    };
  },
};
