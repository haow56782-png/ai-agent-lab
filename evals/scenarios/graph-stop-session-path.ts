import { outputContainsAll } from "../metrics.js";
import type { EvalScenario } from "../metrics.js";

export const graphStopSessionPath: EvalScenario = {
  id: "GRF-003",
  name: "Graph Stop Session Path",
  description: "Knowledge Graph — STOP_SESSION events should be traceable through graph traversal",
  taskPrompt: "A player had the following sequence: Session started → tilt detected (score 0.7) → loss chasing pattern flagged → stop_session triggered. Explain: (1) How would a knowledge graph represent this STOP_SESSION path as connected nodes and edges? (2) What would the STOP_SESSION_PATH query return — root causes, path, recommended action? (3) How does graph traversal help identify intervention points? (4) How would this path summary be used by the behavior engine?",
  expectedOutputFields: ["stop_session", "path", "graph", "travers"],
  expectedConfidenceRange: [0.0, 1.0],
  expectedLatencyMax: 30000,
  mode: "repl",
  validate(output: string) {
    const fieldCheck = outputContainsAll(output, this.expectedOutputFields);
    if (!fieldCheck.passed) return fieldCheck;

    const errors: string[] = [];
    const lower = output.toLowerCase();

    if (!lower.includes("root cause") && !lower.includes("root_cause")) {
      errors.push("Should discuss root causes of STOP_SESSION");
    }

    if (!lower.includes("interven")) {
      errors.push("Should discuss intervention points");
    }

    if (!lower.includes("behavior") && !lower.includes("engine")) {
      errors.push("Should mention behavior engine use");
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
