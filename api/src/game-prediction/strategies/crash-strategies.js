/** ============================================================
 *  Crash Strategies
 *
 *  3 strategies for Crash, mapped to risk preferences:
 *    - conservative-cashout    (conservative)
 *    - balanced-multiplier     (balanced)
 *    - aggressive-multiplier   (aggressive)
 *  ============================================================ */
/* ─── Strategy: conservative-cashout ─── */
const conservativeCashout = {
    name: "conservative-cashout",
    gameType: "CRASH",
    description: "Low-multiplier targeting (1.1x–1.3x). High probability of success. Small bet sizes (1.5% of bankroll).",
    riskPreference: "conservative",
    evaluate(_input, signal) {
        const baseFraction = 0.015;
        // Conservative crash: skip if probability is low or risk is extreme
        if (signal.probability < 0.40 || signal.riskLevel === "EXTREME") {
            return {
                action: "SKIP",
                confidence: 0.85,
                recommendedBetSizeFraction: 0,
                reasoning: `Crash probability (${(signal.probability * 100).toFixed(1)}%) is below conservative threshold. Skipping to protect capital.`,
                warnings: [],
            };
        }
        if (signal.recommendation === "SKIP") {
            return {
                action: "SKIP",
                confidence: 0.75,
                recommendedBetSizeFraction: 0,
                reasoning: `Domain analysis recommends skipping. Conservative strategy defers to this assessment.`,
                warnings: ["Conservative strategy: skipping per domain signal recommendation."],
            };
        }
        return {
            action: "PLAY",
            confidence: 0.80,
            recommendedBetSizeFraction: baseFraction,
            reasoning: `Conservative cashout at ${(signal.probability * 100).toFixed(1)}% probability. Small allocation (${(baseFraction * 100).toFixed(1)}% of bankroll).`,
            warnings: ["Low multipliers offer frequent small wins but can still crash unexpectedly."],
        };
    },
};
/* ─── Strategy: balanced-multiplier ─── */
const balancedMultiplier = {
    name: "balanced-multiplier",
    gameType: "CRASH",
    description: "Medium-multiplier targeting (1.5x–2.5x). Moderate probability with reasonable payout. 4% bankroll.",
    riskPreference: "balanced",
    evaluate(_input, signal) {
        const baseFraction = 0.04;
        if (signal.probability < 0.15 || signal.riskLevel === "EXTREME") {
            return {
                action: "SKIP",
                confidence: 0.75,
                recommendedBetSizeFraction: 0,
                reasoning: `Probability (${(signal.probability * 100).toFixed(1)}%) too low for balanced approach. Waiting for better opportunities.`,
                warnings: [],
            };
        }
        return {
            action: "PLAY",
            confidence: 0.70,
            recommendedBetSizeFraction: baseFraction,
            reasoning: `Balanced multiplier play at ${(signal.probability * 100).toFixed(1)}% probability. ${(baseFraction * 100).toFixed(0)}% bankroll allocation.`,
            warnings: [
                "Crash is a high-volatility game; variance can produce long losing streaks.",
                `The probability of reaching the target multiplier is ${(signal.probability * 100).toFixed(1)}%.`,
            ],
        };
    },
};
/* ─── Strategy: aggressive-multiplier ─── */
const aggressiveMultiplier = {
    name: "aggressive-multiplier",
    gameType: "CRASH",
    description: "High-multiplier targeting (3x+). Low probability, high reward. 7% bankroll allocation.",
    riskPreference: "aggressive",
    evaluate(_input, signal) {
        const baseFraction = 0.07;
        const warnings = [
            "Aggressive crash strategy: targeting high multipliers with low success probability.",
            `Success probability is ${(signal.probability * 100).toFixed(1)}%. Losses are statistically expected.`,
            "High-variance approach — prepare for extended losing streaks.",
        ];
        // Even aggressive strategy skips impossibly low probabilities
        if (signal.probability < 0.02) {
            return {
                action: "SKIP",
                confidence: 0.90,
                recommendedBetSizeFraction: 0,
                reasoning: `Probability (${(signal.probability * 100).toFixed(1)}%) is too low even for aggressive play.`,
                warnings: [...warnings, "Probability too low for any viable strategy."],
            };
        }
        return {
            action: "PLAY",
            confidence: 0.55,
            recommendedBetSizeFraction: baseFraction,
            reasoning: `Aggressive multiplier play. Low probability (${(signal.probability * 100).toFixed(1)}%) but high potential payout. ${(baseFraction * 100).toFixed(0)}% bankroll.`,
            warnings,
        };
    },
};
/* ─── Registry ─── */
export const crashStrategies = {
    "conservative-cashout": conservativeCashout,
    "balanced-multiplier": balancedMultiplier,
    "aggressive-multiplier": aggressiveMultiplier,
};
//# sourceMappingURL=crash-strategies.js.map