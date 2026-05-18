/** ============================================================
 *  Tilt Detector — Identifies emotional/behavioral tilt based
 *  on consecutive losses, bet size escalation, and combined
 *  risk signals.
 *
 *  Tilt indicators:
 *    - 3+ consecutive losses
 *    - Bet size escalation during loss streak
 *    - Win/loss ratio < 0.3 in current session
 *    - Combined pattern severity crossing tilt threshold
 *  ============================================================ */
/* ─── Constants ─── */
const TILT_LOSS_THRESHOLD = 3;
const TILT_BET_ESCALATION = 1.4;
const TILT_WIN_RATE_LOW = 0.3;
const TILT_MIN_BETS = 5;
/**
 * Evaluate whether the player is in a tilt state.
 */
export function evaluateTilt(betHistory, recentResults, sessionState, patterns) {
    const factors = [];
    let score = 0;
    if (recentResults.length < TILT_MIN_BETS) {
        return { isTilt: false, tiltScore: 0, contributingFactors: [] };
    }
    // Factor 1: Consecutive losses
    const consecutiveLosses = sessionState.currentStreak.type === "loss" ? sessionState.currentStreak.count : 0;
    if (consecutiveLosses >= TILT_LOSS_THRESHOLD) {
        const lossFactor = Math.min(1, consecutiveLosses / 6);
        score += lossFactor * 0.3;
        factors.push(`${consecutiveLosses} consecutive losses`);
    }
    // Factor 2: Bet size escalation
    const relevantBets = betHistory.slice(-Math.max(consecutiveLosses, 3));
    if (relevantBets.length >= 2) {
        const avgFirstHalf = relevantBets.slice(0, Math.floor(relevantBets.length / 2))
            .reduce((s, b) => s + b.betSize, 0) / Math.floor(relevantBets.length / 2);
        const avgSecondHalf = relevantBets.slice(Math.floor(relevantBets.length / 2))
            .reduce((s, b) => s + b.betSize, 0) / Math.ceil(relevantBets.length / 2);
        if (avgFirstHalf > 0 && avgSecondHalf / avgFirstHalf > TILT_BET_ESCALATION) {
            score += 0.25;
            factors.push(`Bet size escalation: ${Math.round((avgSecondHalf / avgFirstHalf - 1) * 100)}% increase`);
        }
    }
    // Factor 3: Low win rate
    const wins = recentResults.filter((r) => r === "win").length;
    const winRate = wins / recentResults.length;
    if (winRate < TILT_WIN_RATE_LOW && recentResults.length >= TILT_MIN_BETS) {
        const rateFactor = (TILT_WIN_RATE_LOW - winRate) / TILT_WIN_RATE_LOW;
        score += Math.min(rateFactor, 1) * 0.25;
        factors.push(`Low win rate: ${(winRate * 100).toFixed(0)}%`);
    }
    // Factor 4: High-severity patterns
    const criticalPatterns = patterns.filter((p) => p.severity === "critical" || p.severity === "high");
    if (criticalPatterns.length >= 2) {
        score += 0.2;
        factors.push(`Multiple high-severity patterns: ${criticalPatterns.map((p) => p.pattern).join(", ")}`);
    }
    return {
        isTilt: score >= 0.4,
        tiltScore: Math.round(score * 100) / 100,
        contributingFactors: factors,
    };
}
/**
 * Check for severe fatigue based on session duration and bet count.
 */
export function evaluateFatigue(sessionDurationMinutes, totalBets) {
    if (sessionDurationMinutes <= 30) {
        return { isFatigued: false, fatigueLevel: "none", reason: "Session duration is within normal range." };
    }
    if (sessionDurationMinutes > 120) {
        return {
            isFatigued: true,
            fatigueLevel: "severe",
            reason: `Session length of ${sessionDurationMinutes} minutes exceeds 2-hour recommended maximum. Extended sessions impair judgment.`,
        };
    }
    if (sessionDurationMinutes > 60) {
        // Check bet density
        const betsPerHour = totalBets / (sessionDurationMinutes / 60);
        if (betsPerHour > 30) {
            return {
                isFatigued: true,
                fatigueLevel: "moderate",
                reason: `Session of ${sessionDurationMinutes} minutes with ${totalBets} bets (${betsPerHour.toFixed(0)}/hr). High intensity over extended period.`,
            };
        }
        return {
            isFatigued: false,
            fatigueLevel: "mild",
            reason: `Session of ${sessionDurationMinutes} minutes. Monitor for fatigue.`,
        };
    }
    return { isFatigued: false, fatigueLevel: "none", reason: "Session duration is within normal range." };
}
//# sourceMappingURL=tilt-detector.js.map