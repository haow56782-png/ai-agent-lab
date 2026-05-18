/** ============================================================
 *  History Store — Append-only immutable record store
 *
 *  Features:
 *    - append-only: append() returns a NEW store
 *    - deterministic: same sequence → same state
 *    - timestamp ordering enforced
 *    - no mutation of historical records
 *  ============================================================ */
import type { LearningRecord, CalibrationMetrics } from "./types.js";
export declare class HistoryStore {
    private readonly records;
    constructor(records?: LearningRecord[]);
    /**
     * Append a new record. Returns a NEW HistoryStore (immutable).
     * Throws if predictionId already exists (no mutation).
     */
    append(record: LearningRecord): HistoryStore;
    /** Get all records (read-only view). */
    getAll(): readonly LearningRecord[];
    /** Get records for a specific strategy. */
    getByStrategy(strategyName: string): LearningRecord[];
    /** Get records for a specific game type. */
    getByGameType(gameType: string): LearningRecord[];
    /** Get the most recent N records. */
    getRecent(n: number): LearningRecord[];
    /** Total number of records. */
    get size(): number;
    /** Compute calibration metrics from all records. */
    getCalibration(): CalibrationMetrics;
    /** Count wins and losses. */
    getCounts(): {
        wins: number;
        losses: number;
    };
    /** Deterministic replay: given a sequence of records, produces same state. */
    static replay(records: LearningRecord[]): HistoryStore;
}
//# sourceMappingURL=history-store.d.ts.map