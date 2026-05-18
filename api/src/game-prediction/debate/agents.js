/** ============================================================
 *  Multi-Agent Debate — Agent implementations
 *
 *  Four specialist agents each review the decision pipeline
 *  from their domain perspective and return a structured
 *  evaluation with stance, score, reasoning, objections,
 *  and required adjustments.
 *  ============================================================ */
/* ─── Helpers ─── */
function makeOutput(agentName, agentRole, stance, score, reasoning, objections, requiredAdjustments) {
    return { agentName, agentRole, stance, score, reasoning, objections, requiredAdjustments };
}
const FORBIDDEN = ["guaranteed", "certain win", "sure profit", "必赚", "稳赢", "保证盈利"];
function containsForbidden(text) {
    const lower = text.toLowerCase();
    return FORBIDDEN.some((w) => lower.includes(w.toLowerCase()));
}
/* ════════════════════════════════════════════════════════════
   Probability Analyst
   — Reviews probability, EV, and statistical soundness
   ════════════════════════════════════════════════════════════ */
export function probabilityAnalyst(signal, decision, _riskPref) {
    const objections = [];
    const adjustments = [];
    const prob = signal.probability;
    const ev = signal.expectedValue;
    // Check negative EV
    if (ev != null && ev < 1.0) {
        objections.push(`Negative expected value: EV=${ev.toFixed(4)} < 1.0. Long-term loss expected.`);
        adjustments.push("Reduce bet size or skip — negative EV cannot be overcome by strategy.");
    }
    // Very low probability
    if (prob < 0.15) {
        objections.push(`Very low success probability: ${(prob * 100).toFixed(1)}%.`);
        adjustments.push("Consider a different target with higher probability.");
    }
    else if (prob < 0.25) {
        objections.push(`Low success probability: ${(prob * 100).toFixed(1)}%. High risk of loss.`);
    }
    // Check confidence vs probability gap
    const gap = Math.abs(decision.confidence - prob);
    if (gap > 0.2) {
        objections.push(`Confidence gap: confidence (${(decision.confidence * 100).toFixed(0)}%) vs probability (${(prob * 100).toFixed(0)}%).`);
        adjustments.push("Align confidence closer to actual probability.");
    }
    // Determine stance
    let stance;
    let score;
    let reasoning;
    if (ev != null && ev < 0.95) {
        stance = "OPPOSE";
        score = 0.15;
        reasoning = "Strongly negative expected value. Statistically unsound to proceed.";
    }
    else if (ev != null && ev < 1.0) {
        stance = "OPPOSE";
        score = 0.3;
        reasoning = `Negative EV (${ev.toFixed(4)}). Expected loss per round.`;
    }
    else if (prob < 0.15) {
        stance = "OPPOSE";
        score = 0.2;
        reasoning = `Probability too low (${(prob * 100).toFixed(1)}%) for a viable bet.`;
    }
    else if (prob < 0.3) {
        stance = "CAUTION";
        score = 0.5;
        reasoning = `Low probability (${(prob * 100).toFixed(1)}%). Only proceed with strong bankroll.`;
    }
    else if (prob >= 0.5 && (ev == null || ev >= 1.0)) {
        stance = "SUPPORT";
        score = 0.8;
        reasoning = `Favorable probability (${(prob * 100).toFixed(1)}%) with non-negative EV.`;
    }
    else {
        stance = "CAUTION";
        score = 0.6;
        reasoning = `Moderate probability (${(prob * 100).toFixed(1)}%). Acceptable with risk management.`;
    }
    // Sanity check output
    if (containsForbidden(reasoning)) {
        reasoning = "[Probability Analyst] Statistical assessment — see objections for details.";
    }
    return makeOutput("probability-analyst", "Probability Analyst — evaluates statistical soundness and expected value", stance, score, reasoning, objections, adjustments);
}
/* ════════════════════════════════════════════════════════════
   Risk Manager
   — Reviews risk levels, bankroll exposure, ruin probability
   ════════════════════════════════════════════════════════════ */
export function riskManager(signal, decision, simulationOutput, bankrollContext, riskPreference) {
    const objections = [];
    const adjustments = [];
    // Check risk level
    const riskLevel = decision.riskLevel;
    // Check simulation ruin risk
    let ruinProb = 0;
    if (simulationOutput) {
        ruinProb = simulationOutput.ruinProbability;
        if (ruinProb > 0.3) {
            objections.push(`High ruin probability: ${(ruinProb * 100).toFixed(1)}% across simulations.`);
            adjustments.push("Reduce bet size significantly or stop — risk of total loss is too high.");
        }
        else if (ruinProb > 0.15) {
            objections.push(`Elevated ruin probability: ${(ruinProb * 100).toFixed(1)}%.`);
            adjustments.push("Consider reducing bet size to lower ruin risk.");
        }
    }
    // Check bankroll exposure
    const exposure = bankrollContext.exposureRatio;
    const maxExposure = riskPreference === "conservative" ? 0.05
        : riskPreference === "balanced" ? 0.1
            : 0.15;
    if (exposure > maxExposure) {
        objections.push(`Excessive exposure: ${(exposure * 100).toFixed(1)}% of bankroll (max ${(maxExposure * 100).toFixed(0)}% for ${riskPreference}).`);
        adjustments.push(`Reduce bet to stay within ${(maxExposure * 100).toFixed(0)}% bankroll exposure limit.`);
    }
    // Check extreme/high risk
    if (riskLevel === "EXTREME") {
        objections.push("Risk level is EXTREME. High probability of significant loss.");
        adjustments.push("Only proceed with aggressive risk preference and strict stop-loss.");
    }
    else if (riskLevel === "HIGH" && exposure > 0.08) {
        objections.push(`High risk combined with ${(exposure * 100).toFixed(1)}% exposure is dangerous.`);
        adjustments.push("Reduce position size to under 5% of bankroll for high-risk bets.");
    }
    // Stop-loss check
    if (decision.stopLoss > 0 && bankrollContext.totalBankroll > 0) {
        const stopLossRatio = decision.stopLoss / bankrollContext.totalBankroll;
        if (stopLossRatio > 0.3 && riskPreference !== "aggressive") {
            objections.push(`Stop-loss of ${decision.stopLoss} is ${(stopLossRatio * 100).toFixed(0)}% of bankroll — too high for ${riskPreference} profile.`);
            adjustments.push("Set a tighter stop-loss, ideally under 20% of bankroll.");
        }
    }
    // Determine stance
    let stance;
    let score;
    let reasoning;
    if (ruinProb > 0.3 || riskLevel === "EXTREME") {
        stance = "OPPOSE";
        score = 0.1;
        reasoning = "Unacceptable risk level. Potential for catastrophic loss.";
    }
    else if (ruinProb > 0.15 || riskLevel === "HIGH") {
        stance = "CAUTION";
        score = 0.4;
        reasoning = `Risk is elevated (${riskLevel}). Proceed with tight controls.`;
    }
    else if (riskLevel === "LOW" && exposure <= maxExposure) {
        stance = "SUPPORT";
        score = 0.85;
        reasoning = `Low risk (${riskLevel}) with acceptable exposure (${(exposure * 100).toFixed(1)}%).`;
    }
    else {
        stance = "CAUTION";
        score = 0.55;
        reasoning = `Moderate risk (${riskLevel}) with ${(exposure * 100).toFixed(1)}% exposure. Acceptable with monitoring.`;
    }
    return makeOutput("risk-manager", "Risk Manager — assesses bankroll exposure, ruin probability, and risk levels", stance, score, reasoning, objections, adjustments);
}
/* ════════════════════════════════════════════════════════════
   Strategy Critic
   — Reviews strategy selection, decision logic, consistency
   ════════════════════════════════════════════════════════════ */
export function strategyCritic(signal, decision, riskPreference) {
    const objections = [];
    const adjustments = [];
    // Check alignment between domain recommendation and decision action
    const domainRec = signal.recommendation;
    const decisionAction = decision.action;
    if (domainRec === "SKIP" && decisionAction === "PLAY") {
        objections.push(`Domain recommends SKIP but decision says PLAY. Domain SKIP overrides for non-aggressive profiles.`);
        adjustments.push("Align decision with domain signal for non-aggressive profiles.");
    }
    if (domainRec === "CAUTION" && decisionAction === "PLAY") {
        objections.push("Domain issued CAUTION but decision is PLAY. Additional risk monitoring needed.");
        adjustments.push("Add warning about domain caution being overridden.");
    }
    // Check strategy name coherence
    const strategyName = decision.strategyName;
    if (riskPreference === "conservative" && strategyName.includes("aggressive")) {
        objections.push(`Conservative profile using aggressive strategy "${strategyName}".`);
        adjustments.push("Switch to a conservative strategy.");
    }
    if (riskPreference === "aggressive" && strategyName.includes("conservative")) {
        objections.push(`Aggressive profile using conservative strategy "${strategyName}". May be too restrictive.`);
        adjustments.push("Consider a more aggressive strategy.");
    }
    // Check bet size relative to bankroll
    const betRatio = decision.recommendedBetSize / (decision.stopLoss || 1);
    if (betRatio > 0.5) {
        objections.push(`Bet size (${decision.recommendedBetSize}) is >50% of stop-loss (${decision.stopLoss}).`);
        adjustments.push("Reduce bet size relative to stop-loss.");
    }
    // Determine stance
    let stance;
    let score;
    let reasoning;
    if (domainRec === "SKIP" && decisionAction === "PLAY" && riskPreference !== "aggressive") {
        stance = "OPPOSE";
        score = 0.25;
        reasoning = "Critical strategy inconsistency: domain SKIP ignored for non-aggressive profile.";
    }
    else if (domainRec === "SKIP" && decisionAction === "PLAY") {
        stance = "CAUTION";
        score = 0.45;
        reasoning = "Domain SKIP overridden by aggressive profile. Ensure bankroll can absorb losses.";
    }
    else if (decisionAction === "STOP_SESSION") {
        stance = "SUPPORT";
        score = 0.9;
        reasoning = "Stop-session is the safest action given the conditions.";
    }
    else if (decisionAction === "SKIP") {
        stance = "SUPPORT";
        score = 0.8;
        reasoning = "Skip aligns with disciplined bankroll management.";
    }
    else {
        stance = "SUPPORT";
        score = 0.7;
        reasoning = `Strategy "${strategyName}" is appropriate for ${riskPreference} profile.`;
    }
    return makeOutput("strategy-critic", "Strategy Critic — evaluates strategy selection and decision consistency", stance, score, reasoning, objections, adjustments);
}
/* ════════════════════════════════════════════════════════════
   Learning Auditor
   — Reviews calibration, drift, and learning signals
   ════════════════════════════════════════════════════════════ */
export function learningAuditor(learningOutput, signal, _decision) {
    if (!learningOutput) {
        return makeOutput("learning-auditor", "Learning Auditor — reviews calibration drift and learning signals", "SUPPORT", 0.7, "No learning data available. Skipping learning audit.", [], []);
    }
    const objections = [];
    const adjustments = [];
    // Check Brier score
    if (learningOutput.brierScore > 0.25) {
        objections.push(`Poor calibration: Brier score = ${learningOutput.brierScore.toFixed(4)} (threshold: 0.25).`);
        adjustments.push("Reduce confidence. Historical predictions are poorly calibrated.");
    }
    else if (learningOutput.brierScore > 0.15) {
        objections.push(`Moderate calibration: Brier score = ${learningOutput.brierScore.toFixed(4)}.`);
    }
    // Check confidence drift
    if (learningOutput.calibratedConfidence !== undefined) {
        const drift = Math.abs(learningOutput.calibratedConfidence - signal.confidence);
        if (drift > 0.15) {
            objections.push(`Confidence drift detected: calibrated=${(learningOutput.calibratedConfidence * 100).toFixed(0)}% vs current=${(signal.confidence * 100).toFixed(0)}% (Δ=${(drift * 100).toFixed(0)}%).`);
            adjustments.push("Apply confidence correction factor before proceeding.");
        }
    }
    // Check rolling accuracy
    if (learningOutput.rollingAccuracy < 0.4) {
        objections.push(`Low rolling accuracy: ${(learningOutput.rollingAccuracy * 100).toFixed(1)}%. Strategy underperforming.`);
        adjustments.push("Consider pausing this strategy until performance improves.");
    }
    // Check learning warnings
    if (learningOutput.learningWarnings && learningOutput.learningWarnings.length > 0) {
        for (const w of learningOutput.learningWarnings) {
            objections.push(`Learning warning: ${w}`);
        }
    }
    // Check prediction error trend
    if (learningOutput.predictionError > 0.3) {
        objections.push(`High prediction error: ${(learningOutput.predictionError * 100).toFixed(1)}%.`);
        adjustments.push("Review prediction model or strategy for this game type.");
    }
    // Determine stance
    let stance;
    let score;
    let reasoning;
    if (learningOutput.brierScore > 0.25 || learningOutput.rollingAccuracy < 0.3) {
        stance = "OPPOSE";
        score = 0.2;
        reasoning = "Severe calibration problems. Historical predictions are unreliable.";
    }
    else if (learningOutput.brierScore > 0.15 || learningOutput.rollingAccuracy < 0.5) {
        stance = "CAUTION";
        score = 0.45;
        reasoning = "Calibration or accuracy below threshold. Proceed with reduced confidence.";
    }
    else if (learningOutput.calibrationShift > 0.15) {
        stance = "CAUTION";
        score = 0.5;
        reasoning = `Calibration shift of ${(learningOutput.calibrationShift * 100).toFixed(1)}% detected. Confidence needs adjustment.`;
    }
    else {
        stance = "SUPPORT";
        score = 0.8;
        reasoning = `Good calibration (Brier=${learningOutput.brierScore.toFixed(4)}, accuracy=${(learningOutput.rollingAccuracy * 100).toFixed(1)}%). Learning signals support proceeding.`;
    }
    return makeOutput("learning-auditor", "Learning Auditor — reviews calibration drift, Brier score, and learning signals", stance, score, reasoning, objections, adjustments);
}
//# sourceMappingURL=agents.js.map