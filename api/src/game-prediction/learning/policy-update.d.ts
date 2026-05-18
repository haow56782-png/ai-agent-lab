/** ============================================================
 *  Policy Update — Dynamic strategy adjustment
 *
 *  Based on calibration metrics, adjusts confidence,
 *  recommended bet fraction, and strategy ranking.
 *  ============================================================ */
import type { PolicyUpdate, CalibrationMetrics } from "./types.js";
import type { RiskPreference } from "../decision-engine/types.js";
/**
 * Update strategy policy based on calibration metrics.
 */
export declare function updatePolicy(strategyName: string, metrics: CalibrationMetrics, currentBetFraction: number, riskPreference: RiskPreference): PolicyUpdate;
//# sourceMappingURL=policy-update.d.ts.map