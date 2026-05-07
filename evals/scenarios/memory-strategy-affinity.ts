import { outputContainsAll } from "../metrics.js";
import type { EvalScenario } from "../metrics.js";

export const memoryStrategyAffinity: EvalScenario = {
  id: "MRY-004",
  name: "Memory Strategy Affinity",
  description: "Memory — strategy affinity and reliability should be tracked across sessions",
  taskPrompt: "A player has used 3 strategies across 10 sessions. Strategy 'low-volatility-farming' used 12 times with 8 wins (67% win rate), 'medium-risk-balanced' used 8 times with 4 wins (50%), 'high-risk-momentum' used 5 times with 1 win (20%). Explain: (1) How should a memory system compute strategy affinity and reliability? (2) Which strategy would be preferred and why? (3) How should the system handle declining reliability? (4) How does strategy memory inform the debate engine?",
  expectedOutputFields: ["strategy", "affinity", "reliability", "win rate"],
  expectedConfidenceRange: [0.0, 1.0],
  expectedLatencyMax: 30000,
  mode: "repl",
  validate(output: string) {
    const fieldCheck = outputContainsAll(output, this.expectedOutputFields);
    if (!fieldCheck.passed) return fieldCheck;

    const errors: string[] = [];
    const lower = output.toLowerCase();

    // Must identify preferred strategy
    if (!lower.includes("low-volatility") && !lower.includes("farming") && !lower.includes("preferred") && !lower.includes("top")) {
      errors.push("Should identify preferred strategy");
    }

    // Must discuss reliability
    if (!lower.includes("reliability") && !lower.includes("reliable")) {
      errors.push("Should discuss strategy reliability");
    }

    // Must mention declining performance handling
    if (!lower.includes("decline") && !lower.includes("abandon") && !lower.includes("review")) {
      errors.push("Should discuss handling declining strategy performance");
    }

    // Should mention debate engine
    if (!lower.includes("debate")) {
      errors.push("Should mention how strategy memory informs the debate engine");
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
