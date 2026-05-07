import { outputContainsAll } from "../metrics.js";
import type { EvalScenario } from "../metrics.js";

export const simulationDiceNegativeEV: EvalScenario = {
  id: "SIM-001",
  name: "Dice Simulation Negative EV",
  description: "Dice Monte Carlo — single-number strategy must show negative expected value",
  taskPrompt: "Run a Monte Carlo simulation for dice targeting number 3. Bankroll 1000, bet 20, aggressive. 500 rounds, 100 simulations.",
  expectedOutputFields: ["simulation", "dice", "expected value", "negative", "house edge"],
  expectedConfidenceRange: [0.0, 1.0],
  expectedLatencyMax: 30000,
  mode: "repl",
  validate(output: string) {
    const fieldCheck = outputContainsAll(output, this.expectedOutputFields);
    if (!fieldCheck.passed) return { passed: false, score: fieldCheck.score, errors: fieldCheck.errors };

    // Try to extract any JSON object from output
    const jsonMatch = output.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const data = JSON.parse(jsonMatch[0]);
        const errors: string[] = [];

        if (typeof data.expectedValue !== "number") {
          // Not simulation JSON — that's OK, check narrative instead
          const lower = output.toLowerCase();
          const narrativeEV = lower.includes("-") || lower.includes("negative") || lower.includes("lose") || lower.includes("house edge");
          if (!narrativeEV) {
            errors.push("Output should indicate negative expected value");
          }
        }

        return {
          passed: errors.length === 0,
          score: errors.length === 0 ? 1.0 : 0.5,
          errors,
        };
      } catch {
        // JSON parse failed — check narrative instead
        const lower = output.toLowerCase();
        const hasEV = lower.includes("negative") || lower.includes("house edge") || lower.includes("expected");
        if (!hasEV) {
          return { passed: false, score: 0.5, errors: ["Output should discuss expected value"] };
        }
        return { passed: true, score: 1.0, errors: [] };
      }
    }

    // No JSON — check narrative for simulation discussion
    const lower = output.toLowerCase();
    const hasSimTerms = lower.includes("monte carlo") || lower.includes("simulation");
    const hasEV = lower.includes("-") || lower.includes("negative ev") || lower.includes("house edge") || lower.includes("expected value");
    if (!hasSimTerms || !hasEV) {
      return { passed: false, score: 0.6, errors: ["Output should discuss simulation results and expected value"] };
    }

    return { passed: true, score: 1.0, errors: [] };
  },
};
