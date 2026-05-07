/** ============================================================
 *  Session State — Builds a snapshot of the current betting
 *  session: total bets, frequency, streaks, profit/loss,
 *  and bankroll trajectory.
 *  ============================================================ */

import type { BetEntry, SessionState } from "./types.js";

/**
 * Build a SessionState from bet history and bankroll data.
 */
export function buildSessionState(
  betHistory: BetEntry[],
  bankrollHistory: number[],
  sessionDurationMinutes: number,
  recentResults: Array<"win" | "loss">,
): SessionState {
  if (betHistory.length === 0) {
    const currentBankroll = bankrollHistory.length > 0 ? bankrollHistory[bankrollHistory.length - 1] : 0;
    return {
      totalBets: 0,
      sessionDurationMinutes,
      averageBetSize: 0,
      betFrequencyPerMinute: 0,
      currentStreak: { type: "win", count: 0 },
      totalProfitLoss: 0,
      peakBankroll: currentBankroll,
      currentBankroll,
      recentBetSizes: [],
      recentResults: [],
      lastBetTimestamps: [],
    };
  }

  const totalBets = betHistory.length;
  const totalBetAmount = betHistory.reduce((s, b) => s + b.betSize, 0);
  const averageBetSize = totalBetAmount / totalBets;

  const betFrequency = sessionDurationMinutes > 0
    ? totalBets / sessionDurationMinutes
    : totalBets;

  // Determine current streak
  let streakType: "win" | "loss" = recentResults[recentResults.length - 1] ?? "win";
  let streakCount = 0;
  for (let i = recentResults.length - 1; i >= 0; i--) {
    if (recentResults[i] === streakType) streakCount++;
    else break;
  }

  // P&L from bet history
  let totalProfitLoss = 0;
  let peakBankroll = bankrollHistory.length > 0 ? bankrollHistory[0] : 0;
  for (const b of betHistory) {
    const pl = b.result === "win" ? b.payout - b.betSize : -b.betSize;
    totalProfitLoss += pl;
    if (b.bankrollAfter > peakBankroll) peakBankroll = b.bankrollAfter;
  }

  const currentBankroll = bankrollHistory.length > 0
    ? bankrollHistory[bankrollHistory.length - 1]
    : 0;

  return {
    totalBets,
    sessionDurationMinutes,
    averageBetSize,
    betFrequencyPerMinute: betFrequency,
    currentStreak: { type: streakType, count: streakCount },
    totalProfitLoss,
    peakBankroll,
    currentBankroll,
    recentBetSizes: betHistory.slice(-10).map((b) => b.betSize),
    recentResults: recentResults.slice(-20),
    lastBetTimestamps: betHistory.slice(-10).map((b) => b.timestamp),
  };
}
