/** ============================================================
 *  Learning Engine — Types
 *  ============================================================ */
import type { GameType, RiskLevel } from "../domains/types.js";
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
export interface LearningRecord {
    predictionId: string;
    gameType: string;
    strategyName: string;
    predictedProbability: number;
    confidence: number;
    actualResult: "win" | "loss";
    timestamp: string;
}
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
export interface BetaDist {
    alpha: number;
    beta: number;
}
export interface PolicyUpdate {
    strategyName: string;
    adjustedConfidence: number;
    adjustedBetFraction: number;
    reliabilityScore: number;
    adjustmentReason: string;
    warnings: string[];
}
//# sourceMappingURL=types.d.ts.map