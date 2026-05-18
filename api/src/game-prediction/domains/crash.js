/** ============================================================
 *  Crash — Multiplier-target probability prediction
 *
 *  Crash games use a provably fair algorithm where the crash
 *  point is determined by:  crashPoint = (1 - houseEdge) / (1 - r)
 *  where r ∈ [0, 1).  The probability of reaching at least a
 *  given multiplier M is:  P(crash >= M) = (1 - houseEdge) / M
 *
 *  This is a high-variance game.  Long losing streaks are
 *  statistically expected.
 *  ============================================================ */
/* ─── Constants ─── */
const HOUSE_EDGE = 0.03; // 3% (typical crash game)
const RTP = 1 - HOUSE_EDGE; // 97%
/* ─── Risk profile ─── */
export function getRiskProfile() {
    return {
        gameType: "CRASH",
        rtp: RTP * 100,
        volatility: "HIGH",
        houseEdge: HOUSE_EDGE * 100,
        maxExposure: 100, // crash can go to very high multipliers
        description: "Crash is a high-volatility game where you bet on how high the multiplier "
            + "will go before crashing.  Theoretical RTP is ~97% with a ~3% house edge. "
            + "Variance is extreme — long losing streaks are expected.",
    };
}
export function parseCrashInput(input) {
    const targetMultiplier = input.targetMultiplier;
    if (typeof targetMultiplier !== "number" || targetMultiplier < 1.0) {
        throw new Error(`Invalid targetMultiplier: ${targetMultiplier}. Must be >= 1.0.`);
    }
    return {
        targetMultiplier,
        previousCrashPoints: input.previousCrashPoints ?? [],
    };
}
/* ─── Probability ─── */
/**
 * Probability that the crash point is AT LEAST the given multiplier.
 *
 *   P(crash >= M) = (1 - houseEdge) / M
 *
 * This is the core formula used by most crash games.
 */
export function calculateProbability(multiplier) {
    if (multiplier <= 1.0)
        return 1.0;
    const prob = RTP / multiplier;
    return Math.min(prob, 1.0);
}
/* ─── Confidence ─── */
export function calculateConfidence(probability, historyLength) {
    // Base confidence on theoretical model
    if (probability > 0.5)
        return 0.80;
    if (probability > 0.2)
        return 0.75;
    // Very low probabilities have higher variance in practice
    if (historyLength > 100)
        return 0.70;
    return 0.65;
}
/* ─── Recommendation ─── */
export function generateRecommendation(probability) {
    if (probability >= 0.60) {
        return { recommendation: "CAUTION", riskLevel: "HIGH" };
    }
    if (probability >= 0.35) {
        return { recommendation: "SKIP", riskLevel: "HIGH" };
    }
    return { recommendation: "SKIP", riskLevel: "EXTREME" };
}
/* ─── Explanation ─── */
export function getExplanation(parsed, probability) {
    const parts = [
        `Crash prediction for ${parsed.targetMultiplier.toFixed(1)}x multiplier target.`,
        `Probability of reaching at least ${parsed.targetMultiplier.toFixed(1)}x is ${(probability * 100).toFixed(1)}%.`,
    ];
    if (parsed.targetMultiplier <= 1.5) {
        parts.push("Low multipliers crash less often, but the payout barely covers the risk.");
    }
    else if (parsed.targetMultiplier <= 3.0) {
        parts.push("Medium multipliers offer better payouts but crash more frequently than they appear to.");
    }
    else {
        parts.push("High multipliers are statistically unlikely to hit. The house edge compounds at higher targets.");
    }
    if (parsed.previousCrashPoints.length > 0) {
        parts.push(`Based on ${parsed.previousCrashPoints.length} observed crash points. Past crashes do not predict future ones.`);
    }
    return parts.join(" ");
}
/* ── Disclaimers ── */
function getDisclaimers() {
    return [
        "Crash games have high variance. A long losing streak is statistically expected.",
        "The theoretical model assumes a provably fair algorithm with uniform distribution.",
        "Never bet more than you can afford to lose.",
    ];
}
function getAssumptions() {
    return [
        `House edge is ${(HOUSE_EDGE * 100).toFixed(1)}% (RTP: ${(RTP * 100).toFixed(1)}%).`,
        "Crash points follow the standard distribution: crashPoint = (1 - he) / (1 - r).",
        "Each round is independent. Consecutive losses do not increase win probability.",
    ];
}
/* ─── Main entry ─── */
export function generateSignal(input) {
    const parsed = parseCrashInput(input);
    const probability = calculateProbability(parsed.targetMultiplier);
    const confidence = calculateConfidence(probability, parsed.previousCrashPoints.length);
    const { recommendation, riskLevel } = generateRecommendation(probability);
    // Expected value: probability * multiplier - 1 (bet)
    const expectedValue = probability * parsed.targetMultiplier - 1;
    return {
        gameType: "CRASH",
        recommendation,
        confidence,
        reasoning: probability >= 0.60
            ? `Probability of reaching ${parsed.targetMultiplier.toFixed(1)}x is ${(probability * 100).toFixed(1)}%. Low-multiplier crashes are more common but still risky.`
            : `Probability of reaching ${parsed.targetMultiplier.toFixed(1)}x is ${(probability * 100).toFixed(1)}%. Expected value is ${expectedValue >= 0 ? "positive" : "negative"}.`,
        riskLevel,
        probability,
        expectedValue: Math.round(expectedValue * 1000) / 1000,
        assumptions: getAssumptions(),
        disclaimers: getDisclaimers(),
        riskWarning: riskLevel === "EXTREME"
            ? `Extreme risk: ${(probability * 100).toFixed(1)}% probability. High-multiplier crash targets rarely hit.`
            : `Crash is a high-volatility game. The probability of reaching ${parsed.targetMultiplier.toFixed(1)}x is ${(probability * 100).toFixed(1)}%.`,
        explanation: getExplanation(parsed, probability),
    };
}
//# sourceMappingURL=crash.js.map