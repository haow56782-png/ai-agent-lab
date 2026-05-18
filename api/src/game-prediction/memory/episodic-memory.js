/** ============================================================
 *  Episodic Memory — Notable past events extracted from the
 *  full event log.  Filters for significant losses, wins,
 *  tilt detections, interventions, and STOP_SESSION events.
 *  ============================================================ */
const BIG_LOSS_THRESHOLD = 0.15; // 15% of bankroll
const BIG_WIN_THRESHOLD = 0.25; // 25% of bankroll
/**
 * Build episodic memory from stored events.
 * Extracts significant events and categorizes them.
 */
export function buildEpisodicMemory(playerId, events) {
    const allEvents = [...events].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    // Filter significant losses: prediction_result with large negative impact
    const significantLosses = allEvents.filter((e) => {
        if (e.type === "prediction_result" && e.data.result === "loss") {
            const pct = e.data.bankrollImpactPercent;
            return pct != null && pct >= BIG_LOSS_THRESHOLD;
        }
        return false;
    });
    // Significant wins
    const significantWins = allEvents.filter((e) => {
        if (e.type === "prediction_result" && e.data.result === "win") {
            const pct = e.data.bankrollImpactPercent;
            return pct != null && pct >= BIG_WIN_THRESHOLD;
        }
        return false;
    });
    // Tilt events
    const tiltEvents = allEvents.filter((e) => e.type === "tilt_detected");
    // Intervention events
    const interventionEvents = allEvents.filter((e) => e.type === "behavior_intervention");
    // STOP_SESSION events
    const stopSessionEvents = allEvents.filter((e) => e.type === "stop_session");
    return {
        playerId,
        events: allEvents,
        significantLosses,
        significantWins,
        tiltEvents,
        interventionEvents,
        stopSessionEvents,
    };
}
//# sourceMappingURL=episodic-memory.js.map