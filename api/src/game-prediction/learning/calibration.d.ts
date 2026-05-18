/** ============================================================
 *  Calibration Metrics
 *
 *  Brier Score, Rolling Accuracy, Calibration Curve, Drift.
 *  ============================================================ */
import type { LearningRecord, CalibrationBucket, CalibrationMetrics } from "./types.js";
/**
 * Brier Score = mean of (predictedProbability - actualOutcome)².
 * Lower is better. 0 = perfect, 1 = worst.
 */
export declare function computeBrierScore(records: LearningRecord[]): number;
/**
 * Rolling accuracy over the most recent N predictions.
 */
export declare function computeRollingAccuracy(records: LearningRecord[], window?: number): number;
/**
 * Group predictions into decile buckets and compute actual win rate per bucket.
 */
export declare function computeCalibrationBuckets(records: LearningRecord[]): CalibrationBucket[];
/**
 * Confidence drift = change in confidence over time.
 * Positive means confidence is increasing.
 */
export declare function computeConfidenceDrift(records: LearningRecord[]): number;
/**
 * Strategy reliability = rolling accuracy per strategy.
 */
export declare function computeStrategyReliability(records: LearningRecord[]): Record<string, number>;
/**
 * Compute full calibration metrics from record history.
 */
export declare function computeCalibration(records: LearningRecord[]): CalibrationMetrics;
//# sourceMappingURL=calibration.d.ts.map