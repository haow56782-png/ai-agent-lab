/** ============================================================
 *  Decision Engine — Main entry point
 *
 *  Takes a DecisionInput (game type, bankroll, risk preference,
 *  domain signal, etc.) and produces a structured DecisionOutput
 *  with action, recommended bet size, risk analysis, and full
 *  explanation.
 *
 *  Flow:
 *    1. Select strategy based on game type + risk preference
 *    2. Run risk assessment (bankroll, overbet, ruin, stop)
 *    3. Apply decision policy rules
 *    4. Build final DecisionOutput with explanation
 *  ============================================================ */
import { getDefaultAssumptions, applyPolicy, selectStrategyName, getStrategy } from "./decision-policy.js";
import { assessRisk } from "../risk-engine/index.js";
import { calculateStopLoss, calculateTakeProfit } from "../risk-engine/bankroll.js";
import { generateExplanationReport } from "./report.js";
/**
 * Main decision entry point.
 */
export function decide(input) {
    validateInput(input);
    // 1. Select and run strategy
    const strategyName = selectStrategyName(input.gameType, input.riskPreference);
    const strategy = getStrategy(input.gameType, strategyName);
    const strategyResult = strategy.evaluate(input, input.domainSignal);
    // 2. Risk assessment
    const riskAssessment = assessRisk(input);
    // 3. Apply policy
    const policyResult = applyPolicy(input, strategyResult, riskAssessment, strategyName);
    // 4. Build output
    const stopLoss = calculateStopLoss(input.bankroll, input.riskPreference);
    const takeProfit = calculateTakeProfit(input.bankroll, input.riskPreference);
    const assumptions = [...getDefaultAssumptions(), ...strategyResult.warnings.map((w) => `Note: ${w}`)];
    return {
        action: policyResult.action,
        strategyName,
        recommendedBetSize: policyResult.recommendedBetSize,
        confidence: policyResult.confidence,
        riskLevel: input.domainSignal.riskLevel,
        reasoning: policyResult.reasoning,
        assumptions,
        warnings: policyResult.warnings,
        stopLoss,
        takeProfit: policyResult.action !== "STOP_SESSION" ? takeProfit : undefined,
        explanationReport: generateExplanationReport(input, strategyResult, riskAssessment, policyResult, strategyName),
    };
}
/* ─── Validation ─── */
function validateInput(input) {
    if (!input.gameType)
        throw new Error("gameType is required");
    if (input.bankroll == null || input.bankroll < 0)
        throw new Error("bankroll must be a non-negative number");
    if (input.betSize == null || input.betSize < 0)
        throw new Error("betSize must be a non-negative number");
    if (!input.riskPreference)
        throw new Error("riskPreference is required");
    if (!["conservative", "balanced", "aggressive"].includes(input.riskPreference)) {
        throw new Error(`Invalid riskPreference: ${input.riskPreference}. Must be conservative, balanced, or aggressive.`);
    }
    if (!input.domainSignal)
        throw new Error("domainSignal is required");
}
/* ─── Decide with retry (convenience wrapper) ─── */
export { selectStrategyName, getStrategy } from "./decision-policy.js";
//# sourceMappingURL=index.js.map