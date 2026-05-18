/** ============================================================
 *  Risk Engine — Unified risk assessment
 *
 *  Combines bankroll management, bet validation, and session
 *  stop conditions into a single assessment.
 *  ============================================================ */
import type { RiskAssessment } from "./types.js";
import type { DecisionInput } from "../decision-engine/types.js";
/**
 * Run a full risk assessment for the given decision input.
 */
export declare function assessRisk(input: DecisionInput): RiskAssessment;
//# sourceMappingURL=index.d.ts.map