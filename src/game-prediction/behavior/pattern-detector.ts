/** ============================================================
 *  Pattern Detector — Identifies known problematic betting
 *  patterns from bet history and session state.
 *
 *  Patterns detected:
 *    1. Loss chasing     — consecutive losses + bet size increase
 *    2. Over max loss    — total loss exceeds session maxLoss
 *    3. High frequency   — short intervals between bets
 *    4. Overbet after win — win followed by significantly larger bet
 *    5. Risk mismatch    — behavior doesn't match risk preference
 *  ============================================================ */

import type { BetEntry, PatternMatch, SessionState } from "./types.js";
import type { RiskPreference } from "../decision-engine/types.js";

/* ─── Constants ─── */

const BET_INCREASE_THRESHOLD = 1.3;        // 30% increase = significant
const HIGH_FREQ_THRESHOLD_SECONDS = 30;     // < 30s between bets = high frequency
const OVERBET_AFTER_WIN_MULTIPLIER = 1.5;   // 50% increase after win = overbet
const LOSS_CHASING_MIN_LOSSES = 2;           // minimum consecutive losses to check

/* ─── Pattern detectors ─── */

/**
 * Detect loss chasing: consecutive losses followed by bet size increase.
 */
export function detectLossChasing(
  betHistory: BetEntry[],
  recentResults: Array<"win" | "loss">,
): PatternMatch | null {
  if (recentResults.length < LOSS_CHASING_MIN_LOSSES) return null;

  // Count consecutive losses from most recent
  let consecutiveLosses = 0;
  for (let i = recentResults.length - 1; i >= 0; i--) {
    if (recentResults[i] === "loss") consecutiveLosses++;
    else break;
  }

  if (consecutiveLosses < LOSS_CHASING_MIN_LOSSES) return null;

  // Check if bet size increased during the loss streak
  const relevantBets = betHistory.slice(-consecutiveLosses);
  if (relevantBets.length < 2) return null;

  const firstBet = relevantBets[0].betSize;
  const lastBet = relevantBets[relevantBets.length - 1].betSize;

  if (lastBet > firstBet * BET_INCREASE_THRESHOLD) {
    const increasePct = Math.round((lastBet / firstBet - 1) * 100);
    const severity = consecutiveLosses >= 4 ? "critical" : consecutiveLosses >= 3 ? "high" : "medium";
    return {
      pattern: "loss_chasing",
      severity,
      description: `Loss chasing detected: ${consecutiveLosses} consecutive losses with bet size increasing ${increasePct}%.`,
      detail: `Bets increased from ${firstBet} to ${lastBet} over ${consecutiveLosses} losses. Classic loss-chasing behavior.`,
    };
  }

  return null;
}

/**
 * Detect if total loss exceeds maxLoss.
 */
export function detectOverMaxLoss(
  betHistory: BetEntry[],
  maxLoss: number | undefined,
): PatternMatch | null {
  if (maxLoss == null || maxLoss <= 0) return null;
  if (betHistory.length === 0) return null;

  const initialBankroll = betHistory[0].bankrollAfter - (betHistory[0].result === "win" ? betHistory[0].payout : -betHistory[0].betSize);
  const currentBankroll = betHistory[betHistory.length - 1].bankrollAfter;
  const totalLoss = initialBankroll - currentBankroll;

  if (totalLoss <= 0) return null;

  if (totalLoss >= maxLoss) {
    const severity = totalLoss >= maxLoss * 1.5 ? "critical" : "high";
    return {
      pattern: "over_max_loss",
      severity,
      description: `Total loss (${totalLoss.toFixed(2)}) exceeds maximum allowed loss (${maxLoss.toFixed(2)}).`,
      detail: `Session P&L: -${totalLoss.toFixed(2)} vs maxLoss: ${maxLoss.toFixed(2)}. Exceeded by ${((totalLoss / maxLoss - 1) * 100).toFixed(0)}%.`,
    };
  }

  if (totalLoss >= maxLoss * 0.8) {
    return {
      pattern: "over_max_loss",
      severity: "medium",
      description: `Total loss (${totalLoss.toFixed(2)}) is approaching maxLoss (${maxLoss.toFixed(2)}).`,
      detail: `Session P&L: -${totalLoss.toFixed(2)} is ${((totalLoss / maxLoss) * 100).toFixed(0)}% of maxLoss.`,
    };
  }

  return null;
}

/**
 * Detect high-frequency betting (short intervals between bets).
 */
export function detectHighFrequency(
  lastBetTimestamps: string[],
  sessionDurationMinutes: number,
  totalBets: number,
): PatternMatch | null {
  if (lastBetTimestamps.length < 3) return null;

  // Check intervals between recent bets
  const recent = lastBetTimestamps.slice(-5);
  const intervals: number[] = [];
  for (let i = 1; i < recent.length; i++) {
    const diffMs = new Date(recent[i]).getTime() - new Date(recent[i - 1]).getTime();
    intervals.push(diffMs / 1000);
  }

  const shortIntervals = intervals.filter((i) => i < HIGH_FREQ_THRESHOLD_SECONDS);
  if (shortIntervals.length >= 3) {
    return {
      pattern: "high_frequency",
      severity: "high",
      description: "High-frequency betting detected: 3+ bets with <30s intervals.",
      detail: "Rapid consecutive betting suggests impulsive behavior rather than calculated decisions.",
    };
  }

  // Also check overall frequency
  if (sessionDurationMinutes > 0) {
    const freqPerMin = totalBets / sessionDurationMinutes;
    if (freqPerMin > 2 && sessionDurationMinutes > 5) {
      return {
        pattern: "high_frequency",
        severity: "medium",
        description: `Betting frequency of ${freqPerMin.toFixed(1)} bets/minute is unusually high.`,
        detail: `Session: ${totalBets} bets in ${sessionDurationMinutes} minutes.`,
      };
    }
  }

  return null;
}

/**
 * Detect overbet after a win: winning bet followed by a significantly larger bet.
 */
export function detectOverbetAfterWin(betHistory: BetEntry[]): PatternMatch | null {
  if (betHistory.length < 2) return null;

  const lastBet = betHistory[betHistory.length - 1];
  const prevBet = betHistory[betHistory.length - 2];

  if (prevBet.result === "win" && lastBet.betSize > prevBet.betSize * OVERBET_AFTER_WIN_MULTIPLIER) {
    const increasePct = Math.round((lastBet.betSize / prevBet.betSize - 1) * 100);
    const severity = lastBet.betSize > prevBet.betSize * 2 ? "high" : "medium";
    return {
      pattern: "overbet_after_win",
      severity,
      description: `Bet increased ${increasePct}% after a win (${prevBet.betSize} → ${lastBet.betSize}).`,
      detail: "Increasing bet size after a win can indicate overconfidence bias.",
    };
  }

  return null;
}

/**
 * Detect risk preference mismatch: behavior inconsistent with declared risk preference.
 */
export function detectRiskMismatch(
  betHistory: BetEntry[],
  riskPreference: RiskPreference,
  sessionState: SessionState,
): PatternMatch | null {
  if (betHistory.length < 2) return null;

  // Define max appropriate bet sizes per risk preference (as % of bankroll)
  const maxBetFraction: Record<RiskPreference, number> = {
    conservative: 0.05,
    balanced: 0.10,
    aggressive: 0.20,
  };

  const maxFraction = maxBetFraction[riskPreference];
  const currentBankroll = sessionState.currentBankroll;

  if (currentBankroll <= 0) return null;

  // Check if any recent bet exceeds risk preference limit
  const recentBets = betHistory.slice(-5);
  const oversizedBets = recentBets.filter((b) => b.betSize / currentBankroll > maxFraction);

  if (oversizedBets.length >= 2) {
    const avgRatio = oversizedBets.reduce((s, b) => s + b.betSize / currentBankroll, 0) / oversizedBets.length;
    const severity = oversizedBets.length >= 3 ? "critical" : "high";
    return {
      pattern: "risk_mismatch",
      severity,
      description: `Declared ${riskPreference} risk but ${oversizedBets.length} of last 5 bets exceed ${(maxFraction * 100).toFixed(0)}% bankroll limit.`,
      detail: `Average bet/bankroll ratio: ${(avgRatio * 100).toFixed(1)}%, max allowed: ${(maxFraction * 100).toFixed(0)}% for ${riskPreference} profile.`,
    };
  }

  // Also check average bet size
  const avgBet = sessionState.averageBetSize;
  if (avgBet / currentBankroll > maxFraction * 1.5) {
    return {
      pattern: "risk_mismatch",
      severity: "medium",
      description: `Average bet size (${avgBet.toFixed(2)}) is ${((avgBet / currentBankroll / maxFraction) * 100).toFixed(0)}% of risk limit for ${riskPreference} profile.`,
      detail: `Risk preference: ${riskPreference}, avg bet: ${(avgBet / currentBankroll * 100).toFixed(1)}% of bankroll.`,
    };
  }

  return null;
}

/**
 * Run all pattern detectors and return non-null matches.
 */
export function detectAllPatterns(
  betHistory: BetEntry[],
  recentResults: Array<"win" | "loss">,
  maxLoss: number | undefined,
  riskPreference: RiskPreference,
  sessionState: SessionState,
): PatternMatch[] {
  const patterns: PatternMatch[] = [];

  const lossChasing = detectLossChasing(betHistory, recentResults);
  if (lossChasing) patterns.push(lossChasing);

  const overMaxLoss = detectOverMaxLoss(betHistory, maxLoss);
  if (overMaxLoss) patterns.push(overMaxLoss);

  const highFreq = detectHighFrequency(sessionState.lastBetTimestamps, sessionState.sessionDurationMinutes, sessionState.totalBets);
  if (highFreq) patterns.push(highFreq);

  const overbet = detectOverbetAfterWin(betHistory);
  if (overbet) patterns.push(overbet);

  const mismatch = detectRiskMismatch(betHistory, riskPreference, sessionState);
  if (mismatch) patterns.push(mismatch);

  return patterns;
}
