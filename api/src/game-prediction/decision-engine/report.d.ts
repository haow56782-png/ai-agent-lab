/** ============================================================
 *  Decision Engine — Explanation report generator
 *
 *  Produces a human-readable summary of the decision.
 *  ============================================================ */
import type { DecisionInput } from "./types.js";
import type { StrategyResult } from "../strategies/types.js";
import type { RiskAssessment } from "../risk-engine/types.js";
import type { PolicyResult } from "./decision-policy.js";
export declare function generateExplanationReport(input: DecisionInput, strategyResult: StrategyResult, riskAssessment: RiskAssessment, policyResult: PolicyResult, strategyName: string): string;
//# sourceMappingURL=report.d.ts.map