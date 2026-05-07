/** ============================================================
 *  Game Prediction — Shared domain types for Dice/Crash/Mines
 *  ============================================================ */

export type GameType = "DICE" | "CRASH" | "MINES";

export type Recommendation = "BET" | "SKIP" | "CAUTION";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "EXTREME";

/* ─── Input types ─── */

export interface DiceInput {
  gameType: "DICE";
  targetNumber: number;    // 1–6
  betAmount?: number;
  history?: number[];      // past outcomes for pattern analysis
}

export interface CrashInput {
  gameType: "CRASH";
  targetMultiplier: number; // e.g. 2.0 means 2x
  previousCrashPoints?: number[];
}

export interface MinesInput {
  gameType: "MINES";
  gridSize?: number;       // default 5 (5×5)
  minesCount: number;      // 1–24
  picksCount: number;      // planned picks
}

export type GameInput = DiceInput | CrashInput | MinesInput;

/* ─── Output types ─── */

export interface Signal {
  gameType: GameType;
  recommendation: Recommendation;
  confidence: number;       // 0.0–1.0
  reasoning: string;
  riskLevel: RiskLevel;
  probability: number;      // estimated success probability
  expectedValue?: number;   // expected return multiplier
  assumptions: string[];
  disclaimers: string[];
  riskWarning: string;
  explanation: string;      // detailed human-readable report
}

export interface RiskProfile {
  gameType: GameType;
  rtp: number;              // return-to-player %
  volatility: "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";
  houseEdge: number;        // house edge %
  maxExposure: number;      // max potential loss multiplier
  description: string;
}

/* ─── Helpers ─── */

export function combinations(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  k = Math.min(k, n - k);
  let result = 1;
  for (let i = 1; i <= k; i++) {
    result = (result * (n - k + i)) / i;
  }
  return result;
}
