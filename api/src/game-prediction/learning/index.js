/** ============================================================
 *  Learning Engine — Prediction → Result → Calibration → Update
 *
 *  recordPrediction() is the main entry point:
 *    1. Append record to HistoryStore (immutable)
 *    2. Compute historical stats (wins, losses, consecutive errors)
 *    3. Run Bayesian calibrated confidence
 *    4. Compute calibration metrics
 *    5. Update policy (confidence + bet fraction)
 *    6. Return new store + LearningOutput
 *  ============================================================ */
import { bayesianCalibratedConfidence } from "./bayesian.js";
import { computePredictionError, computeBetFractionAdjustment } from "./confidence.js";
import { updatePolicy } from "./policy-update.js";
/**
 * Count consecutive loss records for a strategy (most recent first).
 */
function countConsecutiveErrors(records) {
    let count = 0;
    for (let i = records.length - 1; i >= 0; i--) {
        if (records[i].actualResult === "loss")
            count++;
        else
            break;
    }
    return count;
}
/**
 * Compute calibration shift magnitude: difference between predicted
 * probability and calibrated Bayesian posterior mean.
 */
function computeCalibrationShift(predictedProbability, calibratedConfidence) {
    return Math.round(Math.abs(predictedProbability - calibratedConfidence) * 10000) / 10000;
}
/**
 * Record a prediction result, update the learning store, and
 * return calibrated output with policy recommendations.
 *
 * @param store - Current HistoryStore (immutable)
 * @param input - The prediction result to record
 * @returns New HistoryStore with the record appended + LearningOutput
 */
export function recordPrediction(store, input) {
    // 1. Build and append the learning record
    const record = {
        predictionId: input.predictionId,
        gameType: input.gameType,
        strategyName: input.strategyName,
        predictedProbability: input.predictedProbability,
        confidence: input.confidence,
        actualResult: input.actualResult,
        timestamp: input.timestamp,
    };
    const newStore = store.append(record);
    // 2. Historical stats
    const counts = newStore.getCounts();
    const strategyRecords = newStore.getByStrategy(input.strategyName);
    const consecutiveErrors = countConsecutiveErrors(strategyRecords);
    const wasCorrect = input.actualResult === "win";
    // 3. Bayesian calibrated confidence
    const calibratedConfidence = bayesianCalibratedConfidence(input.confidence, 10, counts.wins, counts.losses, wasCorrect, consecutiveErrors);
    // 4. Calibration metrics
    const calibrationMetrics = newStore.getCalibration();
    // 5. Prediction error
    const predictionError = computePredictionError(input.predictedProbability, input.actualResult);
    // 6. Calibration shift
    const calibrationShift = computeCalibrationShift(input.predictedProbability, calibratedConfidence);
    // 7. Adjusted bet fraction from calibration quality
    const adjustedBetFraction = computeBetFractionAdjustment(calibrationMetrics.brierScore, calibrationMetrics.rollingAccuracy, 0.03);
    // 8. Policy update
    const policyUpdate = updatePolicy(input.strategyName, calibrationMetrics, 0.03, "balanced");
    // 9. Determine risk level
    let riskLevel = "MEDIUM";
    if (calibrationMetrics.brierScore > 0.25)
        riskLevel = "HIGH";
    else if (calibrationMetrics.brierScore > 0.15)
        riskLevel = "MEDIUM";
    else if (calibratedConfidence > 0.8)
        riskLevel = "LOW";
    // 10. Build updated risk profile
    const updatedRiskProfile = {
        recommendedConfidence: policyUpdate.adjustedConfidence,
        recommendedBetFraction: adjustedBetFraction,
        riskLevel,
    };
    // 11. Build warnings
    const learningWarnings = [...policyUpdate.warnings];
    if (consecutiveErrors >= 3) {
        learningWarnings.push(`${consecutiveErrors} consecutive losses detected for strategy "${input.strategyName}".`);
    }
    // 12. Recommended adjustment description
    const recommendedAdjustment = policyUpdate.adjustmentReason;
    return {
        store: newStore,
        output: {
            calibratedConfidence,
            predictionError,
            rollingAccuracy: calibrationMetrics.rollingAccuracy,
            brierScore: calibrationMetrics.brierScore,
            calibrationShift,
            updatedRiskProfile,
            recommendedAdjustment,
            learningWarnings,
        },
    };
}
//# sourceMappingURL=index.js.map