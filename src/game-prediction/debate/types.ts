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

/* ─── Stance ─── */

export type Stance = "SUPPORT" | "OPPOSE" | "CAUTION";

/* ─── Bankroll context ─── */

export interface BankrollContext {
  totalBankroll: number;
  currentBetSize: number;
  exposureRatio: number;
}

/* ─── Debate input ─── */

export interface DebateInput {
  domainSignal: Signal;
  decisionOutput: DecisionOutput;
  simulationOutput?: SimulationOutput;
  learningOutput?: LearningOutput;
  userRiskPreference: RiskPreference;
  bankrollContext: BankrollContext;
}

/* ─── Individual agent output ─── */

export interface AgentDebateOutput {
  agentName: string;
  agentRole: string;
  stance: Stance;
  score: number;           // 0.0–1.0 confidence in stance
  reasoning: string;
  objections: string[];
  requiredAdjustments: string[];
}

/* ─── Arbiter trace entry ─── */

export interface AgentTraceEntry {
  agentName: string;
  stance: Stance;
  score: number;
}

export type ConsensusLevel = "UNANIMOUS" | "MAJORITY" | "SPLIT" | "ARBITER_OVERRIDE";

/* ─── Final verdict ─── */

export interface FinalDebateOutput {
  finalAction: "PLAY" | "SKIP" | "REDUCE_SIZE" | "STOP_SESSION";
  finalStrategy: string;
  confidenceAdjustment: number;   // delta to apply to confidence
  riskAdjustment: RiskLevel;
  finalWarnings: string[];
  decisionTrace: AgentTraceEntry[];
  consensusLevel: ConsensusLevel;
  summary: string;
}
