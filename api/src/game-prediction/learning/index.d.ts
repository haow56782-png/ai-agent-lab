/** ============================================================
 *  Learning Engine — Prediction → Result → Calibration → Update
 *
 *  recordPrediction() is the main entry point:
 *    1. Append record to HistoryStore (immutable)
 *    2. Compute historical stats (wins, losses, consecutive errors)
 *    3. Run Bayesian calibrated confidence
 *    4. Compute calibration metrics
 *    5. Update policy (confidence + bet fraction)
 *    6. Return new store + LearningOutput
 *  ============================================================ */
import { HistoryStore } from "./history-store.js";
import type { LearningInput, LearningOutput } from "./types.js";
/**
 * Record a prediction result, update the learning store, and
 * return calibrated output with policy recommendations.
 *
 * @param store - Current HistoryStore (immutable)
 * @param input - The prediction result to record
 * @returns New HistoryStore with the record appended + LearningOutput
 */
export declare function recordPrediction(store: HistoryStore, input: LearningInput): {
    store: HistoryStore;
    output: LearningOutput;
};
//# sourceMappingURL=index.d.ts.map