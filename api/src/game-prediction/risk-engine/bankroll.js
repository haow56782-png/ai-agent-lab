/** ============================================================
 *  Risk Engine — Bankroll management
 *
 *  Handles bankroll exposure, overbet detection, risk of ruin,
 *  and session stop conditions.
 *  ============================================================ */
/* ─── Constants ─── */
const EXPOSURE_LIMITS = {
    conservative: { maxExposure: 0.02, warning: 0.02, severe: 0.05 },
    balanced: { maxExposure: 0.05, warning: 0.05, severe: 0.10 },
    aggressive: { maxExposure: 0.10, warning: 0.10, severe: 0.20 },
};
const CONSECUTIVE_LOSS_LIMITS = {
    conservative: 3,
    balanced: 5,
    aggressive: 7,
};
const STOP_LOSS_FACTORS = {
    conservative: 0.15,
    balanced: 0.30,
    aggressive: 0.50,
};
const TAKE_PROFIT_FACTORS = {
    conservative: 0.30,
    balanced: 0.60,
    aggressive: 1.00,
};
/* ─── Public API ─── */
/**
 * Evaluate bankroll status for a given bet size and risk preference.
 */
export function checkBankroll(totalBankroll, betSize, riskPreference, consecutiveLosses, winProbability) {
    const exposureRatio = totalBankroll > 0 ? betSize / totalBankroll : 1;
    const limits = EXPOSURE_LIMITS[riskPreference];
    let overbetLevel = "none";
    if (exposureRatio > limits.severe * 2)
        overbetLevel = "critical";
    else if (exposureRatio > limits.severe)
        overbetLevel = "severe";
    else if (exposureRatio > limits.warning)
        overbetLevel = "warning";
    return {
        totalBankroll,
        currentBetSize: betSize,
        exposureRatio,
        isOverbet: overbetLevel !== "none",
        overbetLevel,
        riskOfRuin: calculateRiskOfRuin(totalBankroll, betSize, winProbability, consecutiveLosses),
        remainingBudget: totalBankroll - betSize,
        consecutiveLosses,
    };
}
/**
 * Simplified risk of ruin.
 *
 * Uses the probability of extending the current loss streak to wipe out
 * the bankroll. A more precise calculation would use full Kelly / Gambler's
 * ruin, but this approximation gives safe guidance.
 *
 *   P(lose N more in a row where N * betSize >= bankroll)
 *
 * Where N = bankroll / betSize (the number of bets needed to bust).
 */
export function calculateRiskOfRuin(bankroll, betSize, winProbability, consecutiveLosses) {
    if (bankroll <= 0 || betSize <= 0)
        return 1;
    if (betSize >= bankroll)
        return 1;
    const lossProbability = 1 - winProbability;
    if (lossProbability <= 0)
        return 0;
    const betsToBust = Math.ceil(bankroll / betSize);
    const remainingBets = Math.max(betsToBust - consecutiveLosses, 1);
    // Approximate risk = probability of losing remainingBets in a row
    return Math.pow(lossProbability, remainingBets);
}
/**
 * Check if bet size triggers an overbet condition.
 */
export function checkOverbet(betSize, bankroll) {
    if (bankroll <= 0)
        return { isOverbet: true, level: "critical", message: "Bankroll is empty." };
    const ratio = betSize / bankroll;
    if (ratio >= 0.50) {
        return { isOverbet: true, level: "critical", message: `Bet size (${(ratio * 100).toFixed(0)}% of bankroll) is critically high.` };
    }
    if (ratio >= 0.25) {
        return { isOverbet: true, level: "severe", message: `Bet size (${(ratio * 100).toFixed(0)}% of bankroll) is very high.` };
    }
    if (ratio >= 0.10) {
        return { isOverbet: true, level: "warning", message: `Bet size (${(ratio * 100).toFixed(0)}% of bankroll) exceeds recommended limit.` };
    }
    return { isOverbet: false, level: "none" };
}
/**
 * Calculate stop-loss threshold based on risk preference.
 */
export function calculateStopLoss(bankroll, riskPreference) {
    return Math.round(bankroll * STOP_LOSS_FACTORS[riskPreference] * 100) / 100;
}
/**
 * Calculate take-profit threshold based on risk preference.
 */
export function calculateTakeProfit(bankroll, riskPreference) {
    return Math.round(bankroll * TAKE_PROFIT_FACTORS[riskPreference] * 100) / 100;
}
/**
 * Determine if a session should stop based on consecutive losses.
 */
export function shouldStopSession(consecutiveLosses, riskPreference, maxLoss, totalLoss) {
    const limit = CONSECUTIVE_LOSS_LIMITS[riskPreference];
    if (consecutiveLosses >= limit) {
        return {
            stop: true,
            reason: `${consecutiveLosses} consecutive losses exceed the ${riskPreference} limit of ${limit}.`,
        };
    }
    if (maxLoss != null && totalLoss != null && totalLoss >= maxLoss) {
        return {
            stop: true,
            reason: `Total loss (${totalLoss}) has reached the maximum allowed loss (${maxLoss}).`,
        };
    }
    return { stop: false };
}
/**
 * Get recommended max bet size for a given bankroll and risk preference.
 */
export function getRecommendedMaxBet(bankroll, riskPreference) {
    const limit = EXPOSURE_LIMITS[riskPreference].maxExposure;
    return Math.round(bankroll * limit * 100) / 100;
}
export { STOP_LOSS_FACTORS, TAKE_PROFIT_FACTORS, CONSECUTIVE_LOSS_LIMITS, EXPOSURE_LIMITS };
//# sourceMappingURL=bankroll.js.map