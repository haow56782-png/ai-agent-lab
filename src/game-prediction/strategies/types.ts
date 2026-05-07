/** ============================================================
 *  Strategies — Shared types
 *  ============================================================ */

import type { Signal } from "../domains/types.js";
import type { DecisionInput, RiskPreference } from "../decision-engine/types.js";

export interface StrategyResult {
  action: "PLAY" | "SKIP";
  confidence: number;
  recommendedBetSizeFraction: number; // fraction of bankroll (e.g. 0.02 = 2%)
  reasoning: string;
  warnings: string[];
}

export interface Strategy {
  name: string;
  gameType: "DICE" | "CRASH" | "MINES";
  description: string;
  riskPreference: RiskPreference;
  evaluate(input: DecisionInput, signal: Signal): StrategyResult;
}

export type StrategyMap = Record<string, Strategy>;
