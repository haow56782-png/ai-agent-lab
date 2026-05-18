/** ============================================================
 *  Final Arbiter — Synthesizes all agent reviews into a
 *  final decision with action, confidence adjustment, risk
 *  adjustment, and a full decision trace.
 *
 *  Decision priority:
 *    1. If any agent OPPOSEs with score ≤ 0.2 → override
 *    2. Majority vote determines action direction
 *    3. Arbiter resolves ties with risk-preference bias
 *  ============================================================ */
/* ─── Helpers ─── */
function makeTrace(agents) {
    return agents.map((a) => ({ agentName: a.agentName, stance: a.stance, score: a.score }));
}
/**
 * Downgrade action by one severity level.
 * PLAY → REDUCE_SIZE → SKIP → STOP_SESSION
 */
function downgradeAction(action) {
    switch (action) {
        case "PLAY": return "REDUCE_SIZE";
        case "REDUCE_SIZE": return "SKIP";
        case "SKIP": return "STOP_SESSION";
        default: return "STOP_SESSION";
    }
}
/**
 * Compute a weighted score from all agents.
 * Positive = lean toward play, Negative = lean toward stop.
 */
function weightedVote(agents) {
    let total = 0;
    for (const a of agents) {
        const direction = a.stance === "SUPPORT" ? 1 : a.stance === "OPPOSE" ? -1 : 0;
        total += direction * a.score;
    }
    return total / agents.length;
}
/**
 * Determine consensus level from agent stances.
 */
function determineConsensus(agents) {
    const stances = agents.map((a) => a.stance);
    const support = stances.filter((s) => s === "SUPPORT").length;
    const oppose = stances.filter((s) => s === "OPPOSE").length;
    const caution = stances.filter((s) => s === "CAUTION").length;
    if (support === agents.length)
        return "UNANIMOUS";
    if (oppose === 0 && caution <= Math.ceil(agents.length / 3))
        return "MAJORITY";
    if (oppose > 0 && support > 0)
        return "SPLIT";
    if (oppose >= Math.ceil(agents.length / 2))
        return "SPLIT";
    return "MAJORITY";
}
/**
 * Synthesize warnings from all agents into final warnings.
 */
function collectWarnings(agents, existingWarnings) {
    const warnings = new Set();
    for (const existing of existingWarnings)
        warnings.add(existing);
    for (const agent of agents) {
        if (agent.stance === "OPPOSE" || agent.stance === "CAUTION") {
            if (agent.objections.length > 0) {
                warnings.add(`[${agent.agentName}] ${agent.objections[0]}`);
            }
        }
    }
    return Array.from(warnings);
}
/**
 * Collect required adjustments from all agents.
 */
function collectAdjustments(agents) {
    const adjustments = new Set();
    for (const agent of agents) {
        for (const adj of agent.requiredAdjustments) {
            adjustments.add(`[${agent.agentName}] ${adj}`);
        }
    }
    return Array.from(adjustments);
}
/* ════════════════════════════════════════════════════════════
   Final Arbiter — main entry point
   ════════════════════════════════════════════════════════════ */
export function finalArbiter(agents, decision) {
    const trace = makeTrace(agents);
    const warnings = collectWarnings(agents, decision.warnings);
    const adjustments = collectAdjustments(agents);
    // Check for hard veto: any agent OPPOSE with score ≤ 0.2
    const hardVeto = agents.find((a) => a.stance === "OPPOSE" && a.score <= 0.2);
    // Check specific agent objections
    const riskManager = agents.find((a) => a.agentName === "risk-manager");
    const probabilityAnalyst = agents.find((a) => a.agentName === "probability-analyst");
    const learningAuditor = agents.find((a) => a.agentName === "learning-auditor");
    const strategyCriticA = agents.find((a) => a.agentName === "strategy-critic");
    // Determine final action
    let finalAction = decision.action;
    let consensusLevel = determineConsensus(agents);
    if (hardVeto) {
        // Hard override — downgrade action
        finalAction = downgradeAction(finalAction);
        consensusLevel = "ARBITER_OVERRIDE";
        warnings.push(`[Arbiter] Hard veto from ${hardVeto.agentName}. Action downgraded to ${finalAction}.`);
    }
    else {
        // Soft arbitration based on weighted vote
        const vote = weightedVote(agents);
        if (vote < -0.3 && finalAction === "PLAY") {
            finalAction = downgradeAction(finalAction);
            if (consensusLevel !== "ARBITER_OVERRIDE")
                consensusLevel = "ARBITER_OVERRIDE";
            warnings.push("[Arbiter] Weighted vote strongly negative. Action downgraded to REDUCE_SIZE.");
        }
        else if (vote < 0 && finalAction === "PLAY") {
            finalAction = "REDUCE_SIZE";
            warnings.push("[Arbiter] Weighted vote slightly negative. Action reduced to REDUCE_SIZE.");
        }
        // Check specific objections that override
        if (riskManager?.stance === "OPPOSE" && riskManager.score <= 0.3 && finalAction !== "STOP_SESSION") {
            finalAction = downgradeAction(finalAction);
            warnings.push("[Arbiter] Risk Manager veto applied. Action downgraded.");
        }
        if (probabilityAnalyst?.stance === "OPPOSE" && finalAction === "PLAY") {
            finalAction = "REDUCE_SIZE";
            warnings.push("[Arbiter] Probability Analyst opposes. Reducing to REDUCE_SIZE.");
        }
        if (strategyCriticA?.stance === "OPPOSE" && finalAction === "PLAY") {
            finalAction = "REDUCE_SIZE";
            warnings.push("[Arbiter] Strategy Critic opposes due to domain DISAGREEMENT. Action reduced.");
        }
    }
    // Compute confidence adjustment
    let confidenceAdjustment = 0;
    const supportCount = agents.filter((a) => a.stance === "SUPPORT").length;
    const opposeCount = agents.filter((a) => a.stance === "OPPOSE").length;
    if (opposeCount > supportCount) {
        confidenceAdjustment = -0.15;
    }
    else if (opposeCount > 0) {
        confidenceAdjustment = -0.05;
    }
    else if (agents.every((a) => a.stance === "SUPPORT")) {
        confidenceAdjustment = 0.05;
    }
    // Risk adjustment
    const riskLevels = ["LOW", "MEDIUM", "HIGH", "EXTREME"];
    const currentRiskIndex = riskLevels.indexOf(decision.riskLevel);
    let riskAdjustment = decision.riskLevel;
    if (opposeCount >= 2) {
        riskAdjustment = riskLevels[Math.min(currentRiskIndex + 1, riskLevels.length - 1)];
    }
    // Build summary
    const traceSummary = trace.map((t) => `${t.agentName}: ${t.stance} (${(t.score * 100).toFixed(0)}%)`).join("; ");
    const summary = finalAction === "STOP_SESSION"
        ? `Debate concluded: STOP_SESSION. ${traceSummary}`
        : finalAction === "SKIP"
            ? `Debate concluded: SKIP this round. ${traceSummary}`
            : finalAction === "REDUCE_SIZE"
                ? `Debate concluded: REDUCE_SIZE with adjustments. ${traceSummary}`
                : `Debate concluded: PLAY with monitoring. ${traceSummary}`;
    return {
        finalAction,
        finalStrategy: decision.strategyName,
        confidenceAdjustment,
        riskAdjustment: riskAdjustment,
        finalWarnings: warnings,
        decisionTrace: trace,
        consensusLevel,
        summary,
    };
}
//# sourceMappingURL=arbiter.js.map