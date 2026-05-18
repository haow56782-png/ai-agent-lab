/** ============================================================
 *  Multi-Agent Debate — Agent implementations
 *
 *  Four specialist agents each review the decision pipeline
 *  from their domain perspective and return a structured
 *  evaluation with stance, score, reasoning, objections,
 *  and required adjustments.
 *  ============================================================ */
import type { Signal } from "../domains/types.js";
import type { DecisionOutput, RiskPreference } from "../decision-engine/types.js";
import type { SimulationOutput } from "../simulation/types.js";
import type { LearningOutput } from "../learning/types.js";
import type { AgentDebateOutput, BankrollContext } from "./types.js";
export declare function probabilityAnalyst(signal: Signal, decision: DecisionOutput, _riskPref: RiskPreference): AgentDebateOutput;
export declare function riskManager(signal: Signal, decision: DecisionOutput, simulationOutput: SimulationOutput | undefined, bankrollContext: BankrollContext, riskPreference: RiskPreference): AgentDebateOutput;
export declare function strategyCritic(signal: Signal, decision: DecisionOutput, riskPreference: RiskPreference): AgentDebateOutput;
export declare function learningAuditor(learningOutput: LearningOutput | undefined, signal: Signal, _decision: DecisionOutput): AgentDebateOutput;
//# sourceMappingURL=agents.d.ts.map