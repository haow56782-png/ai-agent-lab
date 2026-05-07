/** ============================================================
 *  Player Behavior Modeling Engine — Types
 *
 *  Analyzes player behavior patterns to detect tilt, loss
 *  chasing, fatigue, and risk-preference mismatches. Outputs
 *  intervention recommendations for the Decision / Debate
 *  engines.
 *  ============================================================ */

import type { RiskPreference, DecisionOutput } from "../decision-engine/types.js";
import type { LearningOutput } from "../learning/types.js";

/* ─── Behavior states ─── */

export type BehaviorState = "NORMAL" | "CAUTION" | "TILT" | "CHASING_LOSS" | "FATIGUE" | "STOP_REQUIRED";

/* ─── Detected pattern types ─── */

export type DetectedPattern =
  | "loss_chasing"
  | "over_max_loss"
  | "high_frequency"
  | "overbet_after_win"
  | "session_fatigue"
  | "risk_mismatch";

/* ─── Intervention levels ─── */

export type InterventionLevel = "NONE" | "SOFT_WARNING" | "HARD_WARNING" | "FORCE_STOP";
export type RecommendedAction = "KEEP" | "DOWNGRADE" | "STOP_SESSION";

/* ─── Decision adjustment (for Decision Engine / Debate Engine) ─── */

export interface DecisionAdjustment {
  shouldDowngrade: boolean;
  newAction: "PLAY" | "SKIP" | "REDUCE_SIZE" | "STOP_SESSION";
  confidenceReduction: number;
  reason: string;
}

/* ─── Bet history entry ─── */

export interface BetEntry {
  timestamp: string;
  betSize: number;
  result: "win" | "loss";
  payout: number;
  bankrollAfter: number;
}

/* ─── Session state ─── */

export interface SessionState {
  totalBets: number;
  sessionDurationMinutes: number;
  averageBetSize: number;
  betFrequencyPerMinute: number;
  currentStreak: { type: "win" | "loss"; count: number };
  totalProfitLoss: number;
  peakBankroll: number;
  currentBankroll: number;
  recentBetSizes: number[];  // last N bet sizes for trend analysis
  recentResults: Array<"win" | "loss">;
  lastBetTimestamps: string[];
}

/* ─── Behavior input ─── */

export interface BehaviorInput {
  recentResults: Array<"win" | "loss">;
  bankrollHistory: number[];
  betHistory: BetEntry[];
  sessionDurationMinutes: number;
  riskPreference: RiskPreference;
  currentDecision: DecisionOutput;
  learningOutput?: LearningOutput;
  maxLoss?: number;
  timestamp: string;
}

/* ─── Pattern match result ─── */

export interface PatternMatch {
  pattern: DetectedPattern;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  detail: string;
}

/* ─── Behavior output ─── */

export interface BehaviorOutput {
  behaviorState: BehaviorState;
  detectedPatterns: PatternMatch[];
  interventionLevel: InterventionLevel;
  recommendedAction: RecommendedAction;
  decisionAdjustment: DecisionAdjustment;
  reasoning: string;
  warnings: string[];
}
