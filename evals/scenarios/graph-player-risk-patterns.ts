import { outputContainsAll } from "../metrics.js";
import type { EvalScenario } from "../metrics.js";

export const graphPlayerRiskPatterns: EvalScenario = {
  id: "GRF-001",
  name: "Graph Player Risk Patterns",
  description: "Knowledge Graph — player risk patterns should be queryable from the graph",
  taskPrompt: "A player has the following history: 3 sessions with tilt detected in each, 2 stop_session events, and bet sizes increasing after losses (loss_chasing pattern). Explain: (1) How would a knowledge graph represent these risk patterns as nodes and edges? (2) What nodes would be created for tilt, stop_session, and loss_chasing? (3) How would the PLAYER_RISK_PATTERNS query traverse the graph to find these? (4) How would the graph context inform the decision engine about these patterns?",
  expectedOutputFields: ["graph", "risk", "pattern", "node", "edge"],
  expectedConfidenceRange: [0.0, 1.0],
  expectedLatencyMax: 30000,
  mode: "repl",
  validate(output: string) {
    const fieldCheck = outputContainsAll(output, this.expectedOutputFields);
    if (!fieldCheck.passed) return fieldCheck;

    const errors: string[] = [];
    const lower = output.toLowerCase();

    if (!lower.includes("player") && !lower.includes("risk_pattern")) {
      errors.push("Should discuss player risk pattern nodes");
    }

    if (!lower.includes("travers") && !lower.includes("query")) {
      errors.push("Should discuss graph query traversal");
    }

    if (!lower.includes("decision") && !lower.includes("context")) {
      errors.push("Should discuss how graph context informs decision engine");
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
