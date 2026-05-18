/** ============================================================
 *  Semantic Memory — Long-term knowledge extracted from the
 *  player's full event history and profile.
 *
 *  Computes risk score, tilt propensity, bankroll discipline,
 *  strategy affinity/reliability, and repeated tilt escalation.
 *  ============================================================ */
/**
 * Build semantic memory from player profile and events.
 * This is the long-term knowledge passed to Decision/Debate engines.
 */
export function buildSemanticMemory(playerId, profile, events) {
    if (!profile) {
        return {
            playerId,
            riskScore: 0.5,
            tiltPropensity: 0,
            bankrollDiscipline: 0.5,
            strategyAffinity: {},
            strategyReliability: {},
            confidenceTrend: [],
            averageBrierScore: 0,
            averageRollingAccuracy: 0,
            repeatedTiltEscalation: false,
            riskEscalationLevel: "none",
            persistentWarnings: [],
        };
    }
    // Risk score: composite of tilt frequency, discipline, stop sessions
    const tiltFactor = Math.min(0.4, profile.tiltFrequency * 0.2);
    const disciplineFactor = (1 - profile.bankrollDisciplineScore) * 0.3;
    const stopFactor = profile.totalSessions > 0
        ? Math.min(0.3, (profile.totalStopSession / profile.totalSessions) * 0.3)
        : 0;
    const riskScore = Math.round(Math.min(1, tiltFactor + disciplineFactor + stopFactor) * 100) / 100;
    // Tilt propensity: probability of tilt per session
    const tiltPropensity = profile.totalSessions > 0 && profile.tiltCount > 0
        ? Math.round(Math.min(1, profile.tiltCount / profile.totalSessions) * 100) / 100
        : 0;
    // Average Brier score from trend
    const averageBrierScore = profile.brierScoreTrend.length > 0
        ? profile.brierScoreTrend.reduce((s, v) => s + v, 0) / profile.brierScoreTrend.length
        : 0;
    // Average rolling accuracy
    const averageRollingAccuracy = profile.rollingAccuracyTrend.length > 0
        ? profile.rollingAccuracyTrend.reduce((s, v) => s + v, 0) / profile.rollingAccuracyTrend.length
        : 0;
    // Repeated tilt escalation: check if tilt frequency increased over time
    const repeatedTiltEscalation = detectTiltEscalation(events, profile);
    // Risk escalation level
    const riskEscalationLevel = computeRiskEscalation(riskScore, profile.tiltCount, profile.totalStopSession, repeatedTiltEscalation);
    // Persistent warnings
    const persistentWarnings = [];
    if (riskScore > 0.6) {
        persistentWarnings.push(`Long-term risk score is elevated (${riskScore.toFixed(2)}). Monitor all decisions.`);
    }
    if (tiltPropensity > 0.3) {
        persistentWarnings.push(`Tilt propensity is ${(tiltPropensity * 100).toFixed(0)}% per session. High risk of emotional decisions.`);
    }
    if (profile.totalStopSession > 2) {
        persistentWarnings.push(`${profile.totalStopSession} STOP_SESSION events recorded. Consider longer breaks between sessions.`);
    }
    if (repeatedTiltEscalation) {
        persistentWarnings.push("Tilt frequency is escalating across sessions. Intervention urgency increasing.");
    }
    if (profile.bankrollDisciplineScore < 0.3) {
        persistentWarnings.push("Bankroll discipline score is critically low. Stronger constraints recommended.");
    }
    return {
        playerId,
        riskScore,
        tiltPropensity,
        bankrollDiscipline: profile.bankrollDisciplineScore,
        strategyAffinity: profile.strategyAffinity,
        strategyReliability: profile.strategyReliability,
        confidenceTrend: profile.confidenceTrend,
        averageBrierScore: Math.round(averageBrierScore * 10000) / 10000,
        averageRollingAccuracy: Math.round(averageRollingAccuracy * 10000) / 10000,
        repeatedTiltEscalation,
        riskEscalationLevel,
        persistentWarnings,
    };
}
/**
 * Detect if tilt frequency is escalating by comparing first half vs second half of sessions.
 */
function detectTiltEscalation(events, profile) {
    // Group tilt events by session
    const tiltBySession = new Map();
    for (const e of events) {
        if (e.type === "tilt_detected") {
            tiltBySession.set(e.sessionId, (tiltBySession.get(e.sessionId) ?? 0) + 1);
        }
    }
    const sessionIds = [...new Set(events.map((e) => e.sessionId))].sort();
    if (sessionIds.length < 4)
        return false;
    const half = Math.floor(sessionIds.length / 2);
    const firstHalf = sessionIds.slice(0, half);
    const secondHalf = sessionIds.slice(-half);
    const firstTilts = firstHalf.reduce((s, id) => s + (tiltBySession.get(id) ?? 0), 0);
    const secondTilts = secondHalf.reduce((s, id) => s + (tiltBySession.get(id) ?? 0), 0);
    return secondTilts > firstTilts * 1.5 && firstTilts > 0;
}
/**
 * Map risk indicators to an escalation level.
 */
function computeRiskEscalation(riskScore, tiltCount, stopSessionCount, tiltEscalating) {
    if (riskScore > 0.8 || (riskScore > 0.6 && tiltEscalating))
        return "critical";
    if (riskScore > 0.6 || stopSessionCount > 3)
        return "high";
    if (riskScore > 0.4 || tiltCount > 3)
        return "elevated";
    if (riskScore > 0.2 || tiltCount > 0)
        return "monitor";
    return "none";
}
//# sourceMappingURL=semantic-memory.js.map