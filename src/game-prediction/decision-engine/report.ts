/** ============================================================
 *  Decision Engine — Explanation report generator
 *
 *  Produces a human-readable summary of the decision.
 *  ============================================================ */

import type { DecisionInput } from "./types.js";
import type { StrategyResult } from "../strategies/types.js";
import type { RiskAssessment } from "../risk-engine/types.js";
import type { PolicyResult } from "./decision-policy.js";

export function generateExplanationReport(
  input: DecisionInput,
  strategyResult: StrategyResult,
  riskAssessment: RiskAssessment,
  policyResult: PolicyResult,
  strategyName: string,
): string {
  const lines: string[] = [
    `=== Decision Report: ${input.gameType} ===`,
    "",
    `Strategy: ${strategyName} (${input.riskPreference})`,
    `Domain Signal: ${input.domainSignal.recommendation} | Probability: ${(input.domainSignal.probability * 100).toFixed(1)}% | Risk: ${input.domainSignal.riskLevel}`,
    `Bankroll: ${input.bankroll} | Requested Bet: ${input.betSize} | Recommended Bet: ${policyResult.recommendedBetSize}`,
    `Action: ${policyResult.action}`,
    "",
    "--- Reasoning ---",
    policyResult.reasoning,
    "",
  ];

  if (policyResult.warnings.length > 0) {
    lines.push("--- Warnings ---");
    for (const w of policyResult.warnings) {
      lines.push(`  ⚠ ${w}`);
    }
    lines.push("");
  }

  if (riskAssessment.passed) {
    lines.push("Risk Assessment: PASSED");
  } else if (!riskAssessment.stopSession) {
    lines.push("Risk Assessment: PASSED WITH WARNINGS");
  } else {
    lines.push("Risk Assessment: FAILED — Session Stopped");
  }

  lines.push(`Stop Loss: ${policyResult.recommendedBetSize > 0 ? input.bankroll * 0.15 : 0}`);
  lines.push("");

  lines.push("--- Assumptions ---");
  lines.push("- All gambling involves risk. Never bet more than you can afford to lose.");
  lines.push("- Past outcomes do not influence future results.");
  lines.push("- Theoretical probabilities assume fair game mechanics.");
  lines.push("- House edge guarantees negative expected value over extended play.");

  return lines.join("\n");
}
