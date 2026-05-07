/** ============================================================
 *  Learning Engine — Types
 *  ============================================================ */

import type { GameType, RiskLevel } from "../domains/types.js";

/* ─── Input ─── */

export interface LearningInput {
  predictionId: string;
  gameType: GameType;
  strategyName: string;
  predictedProbability: number;
  predictedEV: number;
  confidence: number;
  actualResult: "win" | "loss";
  actualPayout: number;
  bankrollBefore: number;
  bankrollAfter: number;
  simulationSummary?: string;
  timestamp: string;
}

/* ─── Output ─── */

export interface LearningOutput {
  calibratedConfidence: number;
  predictionError: number;
  rollingAccuracy: number;
  brierScore: number;
  calibrationShift: number;
  updatedRiskProfile: UpdatedRiskProfile;
  recommendedAdjustment: string;
  learningWarnings: string[];
}

export interface UpdatedRiskProfile {
  recommendedConfidence: number;
  recommendedBetFraction: number;
  riskLevel: RiskLevel;
}

/* ─── History record ─── */

export interface LearningRecord {
  predictionId: string;
  gameType: string;
  strategyName: string;
  predictedProbability: number;
  confidence: number;
  actualResult: "win" | "loss";
  timestamp: string;
}

/* ─── Calibration ─── */

export interface CalibrationBucket {
  bucketLabel: string;
  predicted: number;
  actual: number;
  count: number;
}

export interface CalibrationMetrics {
  brierScore: number;
  rollingAccuracy: number;
  calibrationBuckets: CalibrationBucket[];
  confidenceDrift: number;
  strategyReliability: Record<string, number>;
}

/* ─── Beta distribution ─── */

export interface BetaDist {
  alpha: number;
  beta: number;
}

/* ─── Policy update ─── */

export interface PolicyUpdate {
  strategyName: string;
  adjustedConfidence: number;
  adjustedBetFraction: number;
  reliabilityScore: number;
  adjustmentReason: string;
  warnings: string[];
}
