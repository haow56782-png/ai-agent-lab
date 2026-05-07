import { outputContainsAll } from "../metrics.js";
import type { EvalScenario } from "../metrics.js";

export const memorySessionSummary: EvalScenario = {
  id: "MRY-002",
  name: "Memory Session Summary",
  description: "Memory — session summary should contain meaningful metrics and constraints",
  taskPrompt: "A player completed a session with 15 bets, 10 wins and 5 losses, starting bankroll 1000 and current bankroll 1050. The strategy used was 'low-volatility-farming' with 60% win rate. Explain: (1) What session metrics should a memory system capture? (2) How would a session summary describe win rate, P&L, and streak? (3) What recommended constraints would be generated for moderate win rate? (4) How does the summary inform the decision engine?",
  expectedOutputFields: ["win rate", "summary", "metric", "constraint"],
  expectedConfidenceRange: [0.0, 1.0],
  expectedLatencyMax: 30000,
  mode: "repl",
  validate(output: string) {
    const fieldCheck = outputContainsAll(output, this.expectedOutputFields);
    if (!fieldCheck.passed) return fieldCheck;

    const errors: string[] = [];
    const lower = output.toLowerCase();

    // Must reference win rate or P&L
    if (!lower.includes("win rate") && !lower.includes("pnl") && !lower.includes("profit")) {
      errors.push("Should discuss win rate or P&L metrics");
    }

    // Must mention constraints
    if (!lower.includes("constraint")) {
      errors.push("Should discuss recommended constraints");
    }

    // Must mention how decision engine uses this
    if (!lower.includes("decision") && !lower.includes("engine")) {
      errors.push("Should mention how session summary feeds the decision engine");
    }

    // Should mention streak
    if (!lower.includes("streak")) {
      errors.push("Should discuss win/loss streak");
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
