/** ============================================================
 *  Simulation Engine — Main entry
 *
 *  Validates input, selects the right domain simulator,
 *  runs Monte Carlo simulation, and returns aggregated results.
 *
 *  Can be called by the Decision Engine for additional context.
 *  ============================================================ */
import type { SimulationInput, SimulationOutput } from "./types.js";
/**
 * Run a full Monte Carlo simulation for the given game/strategy.
 */
export declare function runSimulation(input: SimulationInput): SimulationOutput;
//# sourceMappingURL=index.d.ts.map