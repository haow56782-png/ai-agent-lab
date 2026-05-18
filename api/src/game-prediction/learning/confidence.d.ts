/** ============================================================
 *  Confidence Adjustment
 *
 *  Combines Bayesian posterior with overconfidence penalty,
 *  streak bias suppression, and uncertainty widening to
 *  produce a calibrated confidence score.
 *  ============================================================ */
export interface ConfidenceAdjustmentParams {
    currentConfidence: number;
    priorStrength: number;
    wasCorrect: boolean;
    consecutiveErrors: number;
    historicalWins: number;
    historicalLosses: number;
}
/**
 * Full confidence adjustment pipeline.
 * Returns calibrated confidence in [0.01, 0.99].
 */
export declare function adjustConfidence(params: ConfidenceAdjustmentParams): number;
/**
 * Compute prediction error: |predictedProbability - actualOutcome|.
 */
export declare function computePredictionError(predictedProbability: number, actualResult: "win" | "loss"): number;
/**
 * Determine recommended bet fraction adjustment based on calibration quality.
 */
export declare function computeBetFractionAdjustment(brierScore: number, rollingAccuracy: number, baseFraction: number): number;
//# sourceMappingURL=confidence.d.ts.map