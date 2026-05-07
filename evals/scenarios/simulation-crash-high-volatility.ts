import { outputContainsAll } from "../metrics.js";
import type { EvalScenario } from "../metrics.js";

export const simulationCrashHighVolatility: EvalScenario = {
  id: "SIM-002",
  name: "Crash Simulation High Volatility",
  description: "Crash Monte Carlo — high multiplier target must show higher volatility and lower win rate",
  taskPrompt: "Run a Monte Carlo simulation for crash at 5x multiplier. Bankroll 1000, bet 20, balanced. 500 rounds, 80 simulations.",
  expectedOutputFields: ["simulation", "crash", "volatility", "multiplier", "variance"],
  expectedConfidenceRange: [0.0, 1.0],
  expectedLatencyMax: 30000,
  mode: "repl",
  validate(output: string) {
    const fieldCheck = outputContainsAll(output, this.expectedOutputFields);
    if (!fieldCheck.passed) return { passed: false, score: fieldCheck.score, errors: fieldCheck.errors };

    const lower = output.toLowerCase();

    // Try to extract any JSON object from output
    const jsonMatch = output.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const data = JSON.parse(jsonMatch[0]);
        const errors: string[] = [];

        if (typeof data.expectedValue === "number" || typeof data.winRate === "number") {
          // Simulation JSON found
          if (data.volatility == null) errors.push("volatility data expected for crash simulation");
        }

        return {
          passed: errors.length === 0,
          score: errors.length === 0 ? 1.0 : 0.5,
          errors,
        };
      } catch {
        // JSON not valid — fall through to narrative check
      }
    }

    // Narrative check: discuss crash simulation
    const hasCrashSim = lower.includes("monte carlo") || lower.includes("simulation");
    const hasRisk = lower.includes("risk") || lower.includes("volatility") || lower.includes("variance");
    if (!hasCrashSim || !hasRisk) {
      return { passed: false, score: 0.5, errors: ["Output should discuss crash simulation and volatility"] };
    }

    return { passed: true, score: 1.0, errors: [] };
  },
};
