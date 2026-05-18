/** ============================================================
 *  History Store — Append-only immutable record store
 *
 *  Features:
 *    - append-only: append() returns a NEW store
 *    - deterministic: same sequence → same state
 *    - timestamp ordering enforced
 *    - no mutation of historical records
 *  ============================================================ */
import { computeCalibration } from "./calibration.js";
export class HistoryStore {
    records;
    constructor(records) {
        // Sort by timestamp on construction
        const sorted = records
            ? [...records].sort((a, b) => a.timestamp.localeCompare(b.timestamp))
            : [];
        this.records = Object.freeze(sorted);
    }
    /**
     * Append a new record. Returns a NEW HistoryStore (immutable).
     * Throws if predictionId already exists (no mutation).
     */
    append(record) {
        if (this.records.some((r) => r.predictionId === record.predictionId)) {
            throw new Error(`Duplicate predictionId: ${record.predictionId}. Records are append-only.`);
        }
        return new HistoryStore([...this.records, record]);
    }
    /** Get all records (read-only view). */
    getAll() {
        return this.records;
    }
    /** Get records for a specific strategy. */
    getByStrategy(strategyName) {
        return this.records.filter((r) => r.strategyName === strategyName);
    }
    /** Get records for a specific game type. */
    getByGameType(gameType) {
        return this.records.filter((r) => r.gameType === gameType);
    }
    /** Get the most recent N records. */
    getRecent(n) {
        return this.records.slice(-n);
    }
    /** Total number of records. */
    get size() {
        return this.records.length;
    }
    /** Compute calibration metrics from all records. */
    getCalibration() {
        return computeCalibration([...this.records]);
    }
    /** Count wins and losses. */
    getCounts() {
        const wins = this.records.filter((r) => r.actualResult === "win").length;
        return { wins, losses: this.records.length - wins };
    }
    /** Deterministic replay: given a sequence of records, produces same state. */
    static replay(records) {
        return new HistoryStore(records);
    }
}
//# sourceMappingURL=history-store.js.map