/** ============================================================
 *  Calibration Metrics
 *
 *  Brier Score, Rolling Accuracy, Calibration Curve, Drift.
 *  ============================================================ */
/**
 * Brier Score = mean of (predictedProbability - actualOutcome)².
 * Lower is better. 0 = perfect, 1 = worst.
 */
export function computeBrierScore(records) {
    if (records.length === 0)
        return 0;
    const scores = records.map((r) => {
        const actual = r.actualResult === "win" ? 1 : 0;
        return (r.predictedProbability - actual) ** 2;
    });
    return scores.reduce((a, b) => a + b, 0) / scores.length;
}
/**
 * Rolling accuracy over the most recent N predictions.
 */
export function computeRollingAccuracy(records, window = 50) {
    if (records.length === 0)
        return 0;
    const recent = records.slice(-Math.min(window, records.length));
    const correct = recent.filter((r) => r.actualResult === "win").length;
    return correct / recent.length;
}
/**
 * Group predictions into decile buckets and compute actual win rate per bucket.
 */
export function computeCalibrationBuckets(records) {
    if (records.length === 0)
        return [];
    const buckets = new Map();
    for (let i = 0; i < 10; i++) {
        const label = `${(i * 0.1).toFixed(1)}-${((i + 1) * 0.1).toFixed(1)}`;
        buckets.set(label, { predictedSum: 0, actualSum: 0, count: 0 });
    }
    for (const r of records) {
        const bucketIndex = Math.min(9, Math.floor(r.predictedProbability * 10));
        const label = `${(bucketIndex * 0.1).toFixed(1)}-${((bucketIndex + 1) * 0.1).toFixed(1)}`;
        const bucket = buckets.get(label);
        if (bucket) {
            bucket.predictedSum += r.predictedProbability;
            bucket.actualSum += r.actualResult === "win" ? 1 : 0;
            bucket.count++;
        }
    }
    return Array.from(buckets.entries())
        .filter(([_, b]) => b.count > 0)
        .map(([label, b]) => ({
        bucketLabel: label,
        predicted: Math.round((b.predictedSum / b.count) * 1000) / 1000,
        actual: Math.round((b.actualSum / b.count) * 1000) / 1000,
        count: b.count,
    }));
}
/**
 * Confidence drift = change in confidence over time.
 * Positive means confidence is increasing.
 */
export function computeConfidenceDrift(records) {
    if (records.length < 10)
        return 0;
    const half = Math.floor(records.length / 2);
    const firstHalf = records.slice(0, half);
    const secondHalf = records.slice(-half);
    const firstAvg = firstHalf.reduce((s, r) => s + r.confidence, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((s, r) => s + r.confidence, 0) / secondHalf.length;
    return Math.round((secondAvg - firstAvg) * 1000) / 1000;
}
/**
 * Strategy reliability = rolling accuracy per strategy.
 */
export function computeStrategyReliability(records) {
    const byStrategy = new Map();
    for (const r of records) {
        const existing = byStrategy.get(r.strategyName) ?? [];
        existing.push(r);
        byStrategy.set(r.strategyName, existing);
    }
    const result = {};
    for (const [name, recs] of byStrategy) {
        result[name] = computeRollingAccuracy(recs, recs.length);
    }
    return result;
}
/**
 * Compute full calibration metrics from record history.
 */
export function computeCalibration(records) {
    return {
        brierScore: Math.round(computeBrierScore(records) * 10000) / 10000,
        rollingAccuracy: Math.round(computeRollingAccuracy(records) * 10000) / 10000,
        calibrationBuckets: computeCalibrationBuckets(records),
        confidenceDrift: computeConfidenceDrift(records),
        strategyReliability: computeStrategyReliability(records),
    };
}
//# sourceMappingURL=calibration.js.map