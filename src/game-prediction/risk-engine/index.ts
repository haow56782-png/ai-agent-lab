/** ============================================================
 *  Risk Engine — Unified risk assessment
 *
 *  Combines bankroll management, bet validation, and session
 *  stop conditions into a single assessment.
 *  ============================================================ */

import type { RiskAssessment } from "./types.js";
import type { DecisionInput } from "../decision-engine/types.js";
import {
  checkBankroll,
  checkOverbet,
  shouldStopSession,
  getRecommendedMaxBet,
  calculateStopLoss,
} from "./bankroll.js";

/**
 * Run a full risk assessment for the given decision input.
 */
export function assessRisk(input: DecisionInput): RiskAssessment {
  const warnings: string[] = [];

  // Compute total loss from recent results
  const totalLoss = computeTotalLoss(input);
  const consecutiveLosses = computeConsecutiveLosses(input);

  // Bankroll check
  const bankrollStatus = checkBankroll(
    input.bankroll,
    input.betSize,
    input.riskPreference,
    consecutiveLosses,
    input.domainSignal.probability,
  );

  if (bankrollStatus.isOverbet) {
    warnings.push(
      `Overbet: bet size ${input.betSize} is ${(bankrollStatus.exposureRatio * 100).toFixed(0)}% of bankroll (${input.riskPreference} limit: ${(bankrollStatus.overbetLevel === "critical" ? ">" : "")}${bankrollStatus.overbetLevel === "critical" ? "20" : bankrollStatus.overbetLevel === "severe" ? "10" : "5"}%).`,
    );
  }

  // Overbet check (independent severity check)
  const overbetCheck = checkOverbet(input.betSize, input.bankroll);
  if (overbetCheck.level === "critical") {
    return {
      passed: false,
      warnings: [...warnings, overbetCheck.message ?? ""],
      stopSession: true,
      stopReason: overbetCheck.message,
      recommendedMaxBet: getRecommendedMaxBet(input.bankroll, input.riskPreference),
    };
  }
  if (overbetCheck.isOverbet && overbetCheck.message) {
    warnings.push(overbetCheck.message);
  }

  // Risk of ruin warning
  if (bankrollStatus.riskOfRuin > 0.3) {
    warnings.push(
      `High risk of ruin: ${(bankrollStatus.riskOfRuin * 100).toFixed(0)}% chance of losing entire bankroll at current bet size.`,
    );
  }

  // Session stop check
  const stopCheck = shouldStopSession(
    consecutiveLosses,
    input.riskPreference,
    input.maxLoss,
    totalLoss,
  );
  if (stopCheck.stop) {
    return {
      passed: false,
      warnings: [...warnings, stopCheck.reason ?? ""],
      stopSession: true,
      stopReason: stopCheck.reason,
      recommendedMaxBet: getRecommendedMaxBet(input.bankroll, input.riskPreference),
    };
  }

  // Bankroll depletion check
  if (input.betSize > input.bankroll) {
    return {
      passed: false,
      warnings: [...warnings, "Bet size exceeds remaining bankroll."],
      stopSession: true,
      stopReason: "Insufficient bankroll for the requested bet.",
      recommendedMaxBet: getRecommendedMaxBet(input.bankroll, input.riskPreference),
    };
  }

  const recommendedMax = getRecommendedMaxBet(input.bankroll, input.riskPreference);

  return {
    passed: true,
    warnings,
    stopSession: false,
    recommendedMaxBet: recommendedMax,
  };
}

/* ─── Helpers ─── */

function computeTotalLoss(input: DecisionInput): number {
  if (!input.recentResults || input.recentResults.length === 0) return 0;
  const losses = input.recentResults.filter((r) => r === "loss").length;
  return losses * input.betSize;
}

function computeConsecutiveLosses(input: DecisionInput): number {
  if (!input.recentResults || input.recentResults.length === 0) return 0;
  let count = 0;
  for (let i = input.recentResults.length - 1; i >= 0; i--) {
    if (input.recentResults[i] === "loss") count++;
    else break;
  }
  return count;
}
