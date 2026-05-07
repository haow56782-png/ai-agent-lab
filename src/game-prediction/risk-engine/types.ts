/** ============================================================
 *  Risk Engine — Types
 *  ============================================================ */

export interface BankrollStatus {
  totalBankroll: number;
  currentBetSize: number;
  exposureRatio: number;
  isOverbet: boolean;
  overbetLevel: "none" | "warning" | "severe" | "critical";
  riskOfRuin: number;
  remainingBudget: number;
  consecutiveLosses: number;
}

export interface RiskAssessment {
  passed: boolean;
  warnings: string[];
  stopSession: boolean;
  stopReason?: string;
  recommendedMaxBet: number;
}
