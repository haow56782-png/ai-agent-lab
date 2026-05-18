/** ============================================================
 *  Confidence Adjustment
 *
 *  Combines Bayesian posterior with overconfidence penalty,
 *  streak bias suppression, and uncertainty widening to
 *  produce a calibrated confidence score.
 *  ============================================================ */
import { createPrior, updatePosterior, posteriorMean, computeOverconfidencePenalty, suppressStreakBias, widenUncertainty, } from "./bayesian.js";
/**
 * Full confidence adjustment pipeline.
 * Returns calibrated confidence in [0.01, 0.99].
 */
export function adjustConfidence(params) {
    const prior = createPrior(params.currentConfidence, params.priorStrength);
    const rawPenalty = computeOverconfidencePenalty(params.currentConfidence, !params.wasCorrect);
    const penalty = suppressStreakBias(params.consecutiveErrors, rawPenalty);
    const winContribution = params.wasCorrect ? 1 : 0;
    const lossContribution = params.wasCorrect ? 0 : 1;
    const posterior = updatePosterior(prior, params.historicalWins + winContribution, params.historicalLosses + lossContribution, penalty);
    let calibrated = posteriorMean(posterior);
    // Uncertainty widening: high variance → pull toward 0.5
    const uf = widenUncertainty(posterior);
    calibrated = 0.5 + (calibrated - 0.5) * uf;
    return Math.max(0.01, Math.min(0.99, calibrated));
}
/**
 * Compute prediction error: |predictedProbability - actualOutcome|.
 */
export function computePredictionError(predictedProbability, actualResult) {
    const actual = actualResult === "win" ? 1 : 0;
    return Math.abs(predictedProbability - actual);
}
/**
 * Determine recommended bet fraction adjustment based on calibration quality.
 */
export function computeBetFractionAdjustment(brierScore, rollingAccuracy, baseFraction) {
    if (brierScore > 0.25 || rollingAccuracy < 0.4) {
        // Poor calibration → reduce bet size
        return Math.round(baseFraction * 0.5 * 100) / 100;
    }
    if (brierScore > 0.15 || rollingAccuracy < 0.55) {
        // Moderate calibration → slight reduction
        return Math.round(baseFraction * 0.8 * 100) / 100;
    }
    return baseFraction;
}
//# sourceMappingURL=confidence.js.map