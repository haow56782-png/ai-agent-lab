import { outputContainsAll } from "../metrics.js";
import type { EvalScenario } from "../metrics.js";

export const simulationSeedReproducibility: EvalScenario = {
  id: "SIM-004",
  name: "Simulation Seed Reproducibility",
  description: "Same seed + same params must produce identical simulation results",
  taskPrompt: "Run two Monte Carlo simulations for dice with the same seed 42. Bankroll 1000, bet 10, 200 rounds, 30 simulations. Return both results and confirm they are identical.",
  expectedOutputFields: ["seed", "simulation", "identical", "same"],
  expectedConfidenceRange: [0.0, 1.0],
  expectedLatencyMax: 30000,
  mode: "repl",
  validate(output: string) {
    const fieldCheck = outputContainsAll(output, this.expectedOutputFields);
    if (!fieldCheck.passed) return { passed: false, score: fieldCheck.score, errors: fieldCheck.errors };

    const lower = output.toLowerCase();
    const errors: string[] = [];

    // Check that output discusses reproducibility
    const hasReproduce = lower.includes("reproducib") || lower.includes("identical") || lower.includes("same result");
    const hasSeed = lower.includes("seed") && lower.includes("42");
    const hasTwoRuns = (output.match(/simulation/gi) || []).length >= 2 ||
      lower.includes("run 1") || lower.includes("run 2") ||
      lower.includes("first") || lower.includes("second");

    if (!hasReproduce) errors.push("Output should discuss reproducibility");
    if (!hasSeed) errors.push("Seed 42 should be mentioned");
    if (!hasTwoRuns) errors.push("Output should show two simulation runs");

    return {
      passed: errors.length === 0,
      score: errors.length === 0 ? 1.0 : Math.max(0.5, 1.0 - errors.length / 5),
      errors,
    };
  },
};
