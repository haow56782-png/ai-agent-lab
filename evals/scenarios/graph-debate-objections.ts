import { outputContainsAll } from "../metrics.js";
import type { EvalScenario } from "../metrics.js";

export const graphDebateObjections: EvalScenario = {
  id: "GRF-005",
  name: "Graph Debate Objections",
  description: "Knowledge Graph — debate outcomes and strategy opposition should be queryable",
  taskPrompt: "A debate engine reviewed 3 decisions for a player. The 'high-risk-momentum' strategy was opposed in 2 debates (SPLIT consensus, REDUCE_SIZE action). The 'low-volatility-farming' strategy was supported in all 3 debates (UNANIMOUS, PLAY action). Explain: (1) How would a knowledge graph represent debate outcomes as DEBATE_OUTCOME nodes? (2) How would REVIEWED_BY_DEBATE edges connect debates to strategies? (3) What would the DEBATE_MOST_OPPOSED query return? (4) How does this graph-based view help the system learn which strategies to avoid?",
  expectedOutputFields: ["debate", "oppos", "strategy", "consensus"],
  expectedConfidenceRange: [0.0, 1.0],
  expectedLatencyMax: 30000,
  mode: "repl",
  validate(output: string) {
    const fieldCheck = outputContainsAll(output, this.expectedOutputFields);
    if (!fieldCheck.passed) return fieldCheck;

    const errors: string[] = [];
    const lower = output.toLowerCase();

    if (!lower.includes("debate_outcome") && !lower.includes("debate")) {
      errors.push("Should discuss DEBATE_OUTCOME nodes");
    }

    if (!lower.includes("oppos")) {
      errors.push("Should discuss strategy opposition");
    }

    if (!lower.includes("avoid") && !lower.includes("learn")) {
      errors.push("Should discuss learning from debate opposition");
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
