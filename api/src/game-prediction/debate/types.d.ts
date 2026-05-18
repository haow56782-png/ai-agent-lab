/** ============================================================
 *  Multi-Agent Debate Engine — Types
 *
 *  Each agent (Probability Analyst, Risk Manager, Strategy
 *  Critic, Learning Auditor) produces a structured review.
 *  Final Arbiter synthesizes all reviews into a final decision.
 *  ============================================================ */
import type { Signal, RiskLevel } from "../domains/types.js";
import type { DecisionOutput, RiskPreference } from "../decision-engine/types.js";
import type { SimulationOutput } from "../simulation/types.js";
import type { LearningOutput } from "../learning/types.js";
export type Stance = "SUPPORT" | "OPPOSE" | "CAUTION";
export interface BankrollContext {
    totalBankroll: number;
    currentBetSize: number;
    exposureRatio: number;
}
export interface DebateInput {
    domainSignal: Signal;
    decisionOutput: DecisionOutput;
    simulationOutput?: SimulationOutput;
    learningOutput?: LearningOutput;
    userRiskPreference: RiskPreference;
    bankrollContext: BankrollContext;
}
export interface AgentDebateOutput {
    agentName: string;
    agentRole: string;
    stance: Stance;
    score: number;
    reasoning: string;
    objections: string[];
    requiredAdjustments: string[];
}
export interface AgentTraceEntry {
    agentName: string;
    stance: Stance;
    score: number;
}
export type ConsensusLevel = "UNANIMOUS" | "MAJORITY" | "SPLIT" | "ARBITER_OVERRIDE";
export interface FinalDebateOutput {
    finalAction: "PLAY" | "SKIP" | "REDUCE_SIZE" | "STOP_SESSION";
    finalStrategy: string;
    confidenceAdjustment: number;
    riskAdjustment: RiskLevel;
    finalWarnings: string[];
    decisionTrace: AgentTraceEntry[];
    consensusLevel: ConsensusLevel;
    summary: string;
}
//# sourceMappingURL=types.d.ts.map