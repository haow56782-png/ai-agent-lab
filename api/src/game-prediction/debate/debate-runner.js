/** ============================================================
 *  Debate Runner — Orchestrates the multi-agent debate
 *
 *  1. Probability Analyst reviews signal statistics
 *  2. Risk Manager reviews risk and bankroll
 *  3. Strategy Critic reviews strategy consistency
 *  4. Learning Auditor reviews calibration drift
 *  5. Final Arbiter synthesizes all reviews
 *  ============================================================ */
import { probabilityAnalyst, riskManager, strategyCritic, learningAuditor } from "./agents.js";
import { finalArbiter } from "./arbiter.js";
/**
 * Run the full multi-agent debate pipeline.
 * Returns individual agent outputs + the arbiter's final verdict.
 */
export function runDebate(input) {
    const agents = runAllAgents(input);
    const verdict = finalArbiter(agents, input.decisionOutput);
    return { agents, verdict };
}
/**
 * Run all four specialist agents in sequence.
 * (No inter-agent communication — each evaluates independently.)
 */
function runAllAgents(input) {
    const { domainSignal, decisionOutput, simulationOutput, learningOutput, userRiskPreference, bankrollContext } = input;
    return [
        probabilityAnalyst(domainSignal, decisionOutput, userRiskPreference),
        riskManager(domainSignal, decisionOutput, simulationOutput, bankrollContext, userRiskPreference),
        strategyCritic(domainSignal, decisionOutput, userRiskPreference),
        learningAuditor(learningOutput, domainSignal, decisionOutput),
    ];
}
//# sourceMappingURL=debate-runner.js.map