/**
 * VIB AI — Calibration Analysis
 *
 * Tracks predicted confidence vs observed outcomes and computes
 * calibration metrics (ECE, Brier score, reliability data).
 *
 * For the seed-based heuristic predictor, calibration tells us
 * whether confidence values are well-distributed. When DeepSeek
 * model inference is integrated, it will validate actual prediction
 * accuracy against stated confidence.
 */

export interface CalibrationBin {
  binLower: number;       // e.g. 0.3 for bin [0.3, 0.4)
  binUpper: number;       // e.g. 0.4
  total: number;          // predictions in this bin
  positive: number;       // correct/positive outcomes
  avgConfidence: number;  // average predicted confidence
  accuracy: number;       // observed accuracy (positive/total)
  gap: number;            // |avgConfidence - accuracy|
}

export interface CalibrationResult {
  bins: CalibrationBin[];
  ece: number;            // Expected Calibration Error
  brierScore: number;     // Brier Score
  totalPredictions: number;
  overallAccuracy: number;
  avgConfidence: number;
}

export interface CalibrationPoint {
  predictedConfidence: number;
  actualOutcome: number;  // 0 or 1
}

const DEFAULT_BINS = 10; // 0.0-0.1, 0.1-0.2, ..., 0.9-1.0

/**
 * Compute calibration metrics from a set of (predicted_confidence, actual_outcome) pairs.
 *
 * @param points - Array of {predictedConfidence, actualOutcome} pairs
 * @param binCount - Number of equal-width bins (default 10)
 */
export function computeCalibration(points: CalibrationPoint[], binCount = DEFAULT_BINS): CalibrationResult {
  if (points.length === 0) {
    return {
      bins: [],
      ece: 0,
      brierScore: 0,
      totalPredictions: 0,
      overallAccuracy: 0,
      avgConfidence: 0,
    };
  }

  const binWidth = 1 / binCount;

  // Initialize bins
  const bins: CalibrationBin[] = [];
  for (let i = 0; i < binCount; i++) {
    bins.push({
      binLower: i * binWidth,
      binUpper: (i + 1) * binWidth,
      total: 0,
      positive: 0,
      avgConfidence: 0,
      accuracy: 0,
      gap: 0,
    });
  }

  // Bin each point
  let totalConfidence = 0;
  let totalCorrect = 0;

  for (const p of points) {
    const clampedConfidence = Math.max(0, Math.min(1, p.predictedConfidence));
    const binIdx = Math.min(Math.floor(clampedConfidence / binWidth), binCount - 1);
    const bin = bins[binIdx]!;

    bin.total++;
    bin.avgConfidence += clampedConfidence;
    if (p.actualOutcome >= 0.5) {
      bin.positive++;
      totalCorrect++;
    }

    totalConfidence += clampedConfidence;
  }

  // Compute per-bin metrics
  let ece = 0;
  for (const bin of bins) {
    if (bin.total === 0) continue;
    bin.avgConfidence /= bin.total;
    bin.accuracy = bin.positive / bin.total;
    bin.gap = Math.abs(bin.avgConfidence - bin.accuracy);
    ece += (bin.total / points.length) * bin.gap;
  }

  // Brier score = mean((confidence - outcome)^2)
  const brierScore = points.reduce((sum, p) => {
    return sum + (p.predictedConfidence - p.actualOutcome) ** 2;
  }, 0) / points.length;

  return {
    bins,
    ece,
    brierScore,
    totalPredictions: points.length,
    overallAccuracy: totalCorrect / points.length,
    avgConfidence: totalConfidence / points.length,
  };
}

/**
 * Parse a prediction output string to extract confidence and outcome.
 * Looks for "confidence": X.XX in JSON-like structures.
 */
export function parseConfidenceFromOutput(output: string): number | null {
  const match = output.match(/"confidence"\s*:\s*([\d.]+)/);
  return match ? parseFloat(match[1]!) : null;
}

/** Format calibration report as human-readable string */
export function formatCalibration(cal: CalibrationResult): string {
  const lines: string[] = [
    `── Calibration ─────────────────────`,
    `  Total Predictions:  ${cal.totalPredictions}`,
    `  Overall Accuracy:   ${(cal.overallAccuracy * 100).toFixed(1)}%`,
    `  Avg Confidence:     ${(cal.avgConfidence * 100).toFixed(1)}%`,
    `  ECE:                ${(cal.ece * 100).toFixed(2)}%`,
    `  Brier Score:        ${cal.brierScore.toFixed(4)}`,
    ``,
    `  Bins:`,
  ];

  for (const bin of cal.bins) {
    if (bin.total === 0) continue;
    const bar = "█".repeat(Math.round(bin.accuracy * 20));
    const expected = `${(bin.avgConfidence * 100).toFixed(0)}%`;
    const observed = `${(bin.accuracy * 100).toFixed(0)}%`;
    const gap = `${(bin.gap * 100).toFixed(1)}%`;
    const range = `${(bin.binLower * 100).toFixed(0)}–${(bin.binUpper * 100).toFixed(0)}%`;
    lines.push(`    [${range}] n=${bin.total} exp=${expected} obs=${observed} gap=${gap} ${bar}`);
  }

  if (cal.bins.every((b) => b.total === 0)) {
    lines.push(`    (no calibration data)`);
  }

  // Interpretation
  lines.push(``, `  Interpretation:`);
  if (cal.ece < 0.05) {
    lines.push(`    ✅ Well-calibrated (ECE < 5%)`);
  } else if (cal.ece < 0.10) {
    lines.push(`    ⚠️  Moderate miscalibration (ECE 5–10%)`);
  } else {
    lines.push(`    ❌ Poorly calibrated (ECE > 10%)`);
  }
  if (cal.brierScore < 0.1) {
    lines.push(`    ✅ Low Brier score (< 0.1) — predictions are confident and accurate`);
  } else if (cal.brierScore < 0.25) {
    lines.push(`    ⚠️  Moderate Brier score (0.1–0.25)`);
  } else {
    lines.push(`    ❌ High Brier score (> 0.25) — predictions need improvement`);
  }

  return lines.join("\n");
}
