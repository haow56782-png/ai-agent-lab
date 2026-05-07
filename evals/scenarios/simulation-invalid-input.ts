import type { EvalScenario } from "../metrics.js";

export const simulationInvalidInput: EvalScenario = {
  id: "SIM-005",
  name: "Simulation Invalid Input",
  description: "Invalid simulation parameters must return a clear error",
  taskPrompt: "Run a Monte Carlo simulation for dice with bankroll 0 and bet size 100. What happens?",
  expectedOutputFields: [],
  expectedConfidenceRange: [0.0, 1.0],
  expectedLatencyMax: 15000,
  mode: "repl",
  validate(output: string) {
    const lower = output.toLowerCase();
    const errors: string[] = [];
    const errorIndicators = ["error", "invalid", "must be positive", "cannot", "bankroll must"];

    const hasError = errorIndicators.some((indicator) => lower.includes(indicator));
    if (!hasError) {
      errors.push("output should indicate error for invalid bankroll=0 input");
    }

    return {
      passed: errors.length === 0,
      score: hasError ? 1.0 : 0,
      errors,
    };
  },
};
