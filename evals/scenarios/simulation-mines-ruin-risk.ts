import { outputContainsAll } from "../metrics.js";
import type { EvalScenario } from "../metrics.js";

export const simulationMinesRuinRisk: EvalScenario = {
  id: "SIM-003",
  name: "Mines Simulation Ruin Risk",
  description: "Mines Monte Carlo — high-risk configuration must show elevated ruin probability",
  taskPrompt: "Run a Monte Carlo simulation for mines on a 5x5 grid with 10 mines, 3 picks. Bankroll 500, bet 50, aggressive. 200 rounds, 50 simulations.",
  expectedOutputFields: ["simulation", "mines", "ruin", "risk", "warning"],
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

        if (typeof data.ruinProbability === "number") errors.push("Ruin probability should be mentioned");
        if (Array.isArray(data.warnings)) errors.pop(); // warnings is good

        return {
          passed: errors.length === 0,
          score: errors.length === 0 ? 1.0 : 0.5,
          errors,
        };
      } catch {
        // JSON not valid — fall through to narrative check
      }
    }

    // Narrative: check for mines/ruin discussion
    const hasSim = lower.includes("monte carlo") || lower.includes("simulation");
    const hasRuin = lower.includes("ruin") || lower.includes("bankrupt") || lower.includes("lose");
    const hasWarning = lower.includes("warning") || lower.includes("caution") || lower.includes("high risk");
    if (!hasSim || !hasRuin) {
      return { passed: false, score: 0.5, errors: ["Output should discuss simulation and ruin risk"] };
    }
    if (!hasWarning) {
      return { passed: false, score: 0.7, errors: ["Warnings or caution expected for high-risk mines"] };
    }

    return { passed: true, score: 1.0, errors: [] };
  },
};
