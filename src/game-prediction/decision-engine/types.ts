/** ============================================================
 *  Decision Engine — Input / Output types
 *  ============================================================ */

import type { GameType, Signal, RiskLevel } from "../domains/types.js";

export type RiskPreference = "conservative" | "balanced" | "aggressive";
export type DecisionAction = "PLAY" | "SKIP" | "REDUCE_SIZE" | "STOP_SESSION";

export interface DecisionInput {
  gameType: GameType;
  bankroll: number;
  betSize: number;
  riskPreference: RiskPreference;
  sessionGoal?: string;
  maxLoss?: number;
  recentResults?: Array<"win" | "loss">;
  domainSignal: Signal;
}

export interface DecisionOutput {
  action: DecisionAction;
  strategyName: string;
  recommendedBetSize: number;
  confidence: number;
  riskLevel: RiskLevel;
  reasoning: string;
  assumptions: string[];
  warnings: string[];
  stopLoss: number;
  takeProfit?: number;
  explanationReport: string;
}
