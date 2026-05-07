/** ============================================================
 *  Policy Update — Dynamic strategy adjustment
 *
 *  Based on calibration metrics, adjusts confidence,
 *  recommended bet fraction, and strategy ranking.
 *  ============================================================ */

import type { PolicyUpdate, CalibrationMetrics } from "./types.js";
import type { RiskPreference } from "../decision-engine/types.js";

/**
 * Update strategy policy based on calibration metrics.
 */
export function updatePolicy(
  strategyName: string,
  metrics: CalibrationMetrics,
  currentBetFraction: number,
  riskPreference: RiskPreference,
): PolicyUpdate {
  const reliability = metrics.strategyReliability[strategyName] ?? metrics.rollingAccuracy;
  const warnings: string[] = [];

  // Reliability score: how well this strategy performs
  const reliabilityScore = Math.round(reliability * 10000) / 10000;

  // Determine adjustments
  let adjustedConfidence: number;
  let adjustedBetFraction = currentBetFraction;
  let adjustmentReason: string;

  if (metrics.brierScore > 0.25) {
    // Poor calibration
    adjustedConfidence = Math.max(0.3, reliability - 0.1);
    adjustedBetFraction = currentBetFraction * 0.5;
    warnings.push("Calibration is poor (Brier score > 0.25). Reducing confidence and bet size.");
    adjustmentReason = "Poor calibration detected. Confidence reduced to match observed accuracy.";
  } else if (metrics.brierScore > 0.15) {
    // Moderate calibration
    adjustedConfidence = Math.max(0.4, reliability);
    adjustedBetFraction = currentBetFraction * 0.8;
    warnings.push("Calibration is moderate. Slight reduction in bet size advised.");
    adjustmentReason = "Moderate calibration. Confidence adjusted to align with observed accuracy.";
  } else if (metrics.confidenceDrift > 0.1) {
    // Confidence drifting up without accuracy improvement
    adjustedConfidence = Math.min(reliability, 0.7);
    warnings.push("Confidence is drifting upward without corresponding accuracy improvement.");
    adjustmentReason = "Confidence drift detected. Applying correction.";
  } else {
    // Good calibration
    adjustedConfidence = Math.min(reliability + 0.05, 0.95);
    adjustmentReason = "Calibration is within acceptable range. Maintaining current settings.";
  }

  // Overconfidence check
  if (reliability < 0.4 && adjustedConfidence > 0.6) {
    adjustedConfidence = Math.min(adjustedConfidence, 0.5);
    warnings.push("Large gap between confidence and actual accuracy. Forcing confidence cap.");
  }

  // Risk preference bound
  if (riskPreference === "conservative") {
    adjustedConfidence = Math.min(adjustedConfidence, 0.8);
  }

  return {
    strategyName,
    adjustedConfidence: Math.round(adjustedConfidence * 10000) / 10000,
    adjustedBetFraction: Math.round(adjustedBetFraction * 10000) / 10000,
    reliabilityScore,
    adjustmentReason,
    warnings,
  };
}
