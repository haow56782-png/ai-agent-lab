/** ============================================================
 *  Decision Engine — Policy rules
 *
 *  Strategy selection and decision policy that overrides or
 *  adjusts strategy recommendations based on risk constraints.
 *  ============================================================ */
import { diceStrategies } from "../strategies/dice-strategies.js";
import { crashStrategies } from "../strategies/crash-strategies.js";
import { minesStrategies } from "../strategies/mines-strategies.js";
/* ─── Strategy selection ─── */
const STRATEGY_REGISTRY = {
    DICE: diceStrategies,
    CRASH: crashStrategies,
    MINES: minesStrategies,
};
const RISK_TO_STRATEGY = {
    DICE: { conservative: "capital-preservation", balanced: "low-volatility-farming", aggressive: "high-risk-sniper" },
    CRASH: { conservative: "conservative-cashout", balanced: "balanced-multiplier", aggressive: "aggressive-multiplier" },
    MINES: { conservative: "low-tile-safe", balanced: "balanced-reveal", aggressive: "high-volatility-reveal" },
};
/**
 * Select the strategy name for a given game type and risk preference.
 */
export function selectStrategyName(gameType, riskPreference) {
    const strategyName = RISK_TO_STRATEGY[gameType]?.[riskPreference];
    if (!strategyName) {
        throw new Error(`No strategy found for ${gameType} with ${riskPreference} preference.`);
    }
    return strategyName;
}
/**
 * Get the strategy object by game type and strategy name.
 */
export function getStrategy(gameType, strategyName) {
    const gameStrategies = STRATEGY_REGISTRY[gameType];
    if (!gameStrategies) {
        throw new Error(`Unknown game type: ${gameType}`);
    }
    const strategy = gameStrategies[strategyName];
    if (!strategy) {
        throw new Error(`Unknown strategy "${strategyName}" for ${gameType}. Available: ${Object.keys(gameStrategies).join(", ")}`);
    }
    return strategy;
}
/**
 * Apply decision policy rules on top of strategy + risk assessment.
 *
 * Rules:
 *  1. If risk says stop → STOP_SESSION
 *  2. If domain SKIP + strategy PLAY → REDUCE_SIZE (unless aggressive)
 *  3. If overbet severe → REDUCE_SIZE
 *  4. If risk of ruin high → STOP_SESSION
 *  5. Default → strategy recommendation
 */
export function applyPolicy(input, strategyResult, riskAssessment, strategyName) {
    const warnings = [...strategyResult.warnings, ...riskAssessment.warnings];
    const confidence = Math.min(strategyResult.confidence, 1.0);
    // Rule 1: Risk engine says stop
    if (riskAssessment.stopSession) {
        const betSize = Math.min(input.betSize, riskAssessment.recommendedMaxBet);
        return {
            action: "STOP_SESSION",
            recommendedBetSize: betSize,
            confidence: 0.95,
            reasoning: riskAssessment.stopReason ?? "Risk assessment triggered session stop.",
            warnings: [...warnings, "Session stopped by risk engine."],
        };
    }
    // Rule 2: Domain SKIP + strategy PLAY → REDUCE_SIZE if not aggressive
    if (input.domainSignal.recommendation === "SKIP" &&
        strategyResult.action === "PLAY" &&
        input.riskPreference !== "aggressive") {
        const reducedBet = Math.round(strategyResult.recommendedBetSizeFraction * input.bankroll * 0.5 * 100) / 100;
        warnings.push("Domain signal recommends SKIP. Reducing bet size as precaution.");
        return {
            action: "REDUCE_SIZE",
            recommendedBetSize: reducedBet,
            confidence: confidence * 0.9,
            reasoning: `Domain recommends SKIP for ${input.gameType}. Reducing bet size by 50% as compromise between strategy and signal.`,
            warnings,
        };
    }
    // Rule 3: Overbet detected → REDUCE_SIZE
    const overbetSevere = riskAssessment.warnings.some((w) => w.includes("Overbet") && (w.includes("severe") || w.includes("critical")));
    if (overbetSevere) {
        const reducedBet = riskAssessment.recommendedMaxBet;
        warnings.push("Overbet detected. Reducing to recommended max.");
        return {
            action: "REDUCE_SIZE",
            recommendedBetSize: reducedBet,
            confidence: confidence * 0.85,
            reasoning: `Bet size exceeds safe limits for ${input.riskPreference} profile. Reducing to recommended maximum (${reducedBet}).`,
            warnings,
        };
    }
    // Rule 4: Strategy says SKIP
    if (strategyResult.action === "SKIP") {
        return {
            action: "SKIP",
            recommendedBetSize: 0,
            confidence,
            reasoning: strategyResult.reasoning,
            warnings,
        };
    }
    // Default: PLAY with recommended bet size
    const recommendedBetSize = Math.round(Math.min(strategyResult.recommendedBetSizeFraction * input.bankroll, riskAssessment.recommendedMaxBet) * 100) / 100;
    return {
        action: "PLAY",
        recommendedBetSize: Math.max(recommendedBetSize, 0),
        confidence,
        reasoning: strategyResult.reasoning,
        warnings,
    };
}
/* ─── Assumptions ─── */
export function getDefaultAssumptions() {
    return [
        "All gambling involves risk. Never bet more than you can afford to lose.",
        "Past outcomes do not influence future results — each round is independent.",
        "Theoretical probabilities assume fair game mechanics and provably random outcomes.",
        "House edge guarantees negative expected value over extended play.",
        "Strategy recommendations are probabilistic suggestions, not guarantees.",
    ];
}
//# sourceMappingURL=decision-policy.js.map