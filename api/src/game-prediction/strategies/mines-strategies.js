/** ============================================================
 *  Mines Strategies
 *
 *  3 strategies for Mines, mapped to risk preferences:
 *    - low-tile-safe           (conservative)
 *    - balanced-reveal         (balanced)
 *    - high-volatility-reveal  (aggressive)
 *  ============================================================ */
/* ─── Strategy: low-tile-safe ─── */
const lowTileSafe = {
    name: "low-tile-safe",
    gameType: "MINES",
    description: "Few mines (1-2), single pick. High survival probability (~92-96%). Small bet (2% of bankroll).",
    riskPreference: "conservative",
    evaluate(_input, signal) {
        const baseFraction = 0.02;
        // Conservative mines: only play with high probability
        if (signal.probability < 0.50) {
            return {
                action: "SKIP",
                confidence: 0.90,
                recommendedBetSizeFraction: 0,
                reasoning: `Survival probability (${(signal.probability * 100).toFixed(1)}%) is below conservative threshold. Too many mines for low-risk play.`,
                warnings: [],
            };
        }
        if (signal.recommendation === "SKIP") {
            return {
                action: "SKIP",
                confidence: 0.80,
                recommendedBetSizeFraction: 0,
                reasoning: `Domain signal recommends skip. Conservative strategy defers.`,
                warnings: ["Skipping per domain assessment."],
            };
        }
        return {
            action: "PLAY",
            confidence: 0.85,
            recommendedBetSizeFraction: baseFraction,
            reasoning: `Conservative mines play: survival probability ${(signal.probability * 100).toFixed(1)}%. Small allocation (${(baseFraction * 100).toFixed(0)}% of bankroll).`,
            warnings: ["Mines can hit on the first pick regardless of probability."],
        };
    },
};
/* ─── Strategy: balanced-reveal ─── */
const balancedReveal = {
    name: "balanced-reveal",
    gameType: "MINES",
    description: "Moderate mines (3-5), 2-3 picks. Balanced probability (50-70%). 3.5% bankroll.",
    riskPreference: "balanced",
    evaluate(_input, signal) {
        const baseFraction = 0.035;
        if (signal.probability < 0.25) {
            return {
                action: "SKIP",
                confidence: 0.80,
                recommendedBetSizeFraction: 0,
                reasoning: `Survival probability (${(signal.probability * 100).toFixed(1)}%) too low for balanced approach. Reduce mines or picks.`,
                warnings: [],
            };
        }
        return {
            action: "PLAY",
            confidence: 0.75,
            recommendedBetSizeFraction: baseFraction,
            reasoning: `Balanced mines reveal: ${(signal.probability * 100).toFixed(1)}% survival probability. ${(baseFraction * 100).toFixed(0)}% bankroll allocation.`,
            warnings: [
                `With ${((1 - signal.probability) * 100).toFixed(0)}% chance of hitting a mine, losses are a real possibility.`,
                "Past successful picks do not change future mine probability.",
            ],
        };
    },
};
/* ─── Strategy: high-volatility-reveal ─── */
const highVolatilityReveal = {
    name: "high-volatility-reveal",
    gameType: "MINES",
    description: "Many mines (8+), multiple picks. Low probability, high payout. 6% bankroll.",
    riskPreference: "aggressive",
    evaluate(_input, signal) {
        const baseFraction = 0.06;
        const warnings = [
            "High-volatility mines strategy: many mines with multiple picks.",
            `Survival probability is only ${(signal.probability * 100).toFixed(1)}%.`,
            "Extreme variance — can lose the entire bet on the first pick.",
        ];
        if (signal.probability < 0.05) {
            return {
                action: "SKIP",
                confidence: 0.95,
                recommendedBetSizeFraction: 0,
                reasoning: `Survival probability (${(signal.probability * 100).toFixed(1)}%) is too low for viable play.`,
                warnings: [...warnings, "Probability too low for any strategy."],
            };
        }
        return {
            action: "PLAY",
            confidence: 0.55,
            recommendedBetSizeFraction: baseFraction,
            reasoning: `Aggressive mines: ${(signal.probability * 100).toFixed(1)}% survival probability with ${(baseFraction * 100).toFixed(0)}% bankroll allocation. High risk, high potential payout.`,
            warnings,
        };
    },
};
/* ─── Registry ─── */
export const minesStrategies = {
    "low-tile-safe": lowTileSafe,
    "balanced-reveal": balancedReveal,
    "high-volatility-reveal": highVolatilityReveal,
};
//# sourceMappingURL=mines-strategies.js.map