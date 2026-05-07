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
import { computeCalibration } from "./calibration.js";

export class HistoryStore {
  private readonly records: readonly LearningRecord[];

  constructor(records?: LearningRecord[]) {
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
  append(record: LearningRecord): HistoryStore {
    if (this.records.some((r) => r.predictionId === record.predictionId)) {
      throw new Error(`Duplicate predictionId: ${record.predictionId}. Records are append-only.`);
    }
    return new HistoryStore([...this.records, record]);
  }

  /** Get all records (read-only view). */
  getAll(): readonly LearningRecord[] {
    return this.records;
  }

  /** Get records for a specific strategy. */
  getByStrategy(strategyName: string): LearningRecord[] {
    return this.records.filter((r) => r.strategyName === strategyName);
  }

  /** Get records for a specific game type. */
  getByGameType(gameType: string): LearningRecord[] {
    return this.records.filter((r) => r.gameType === gameType);
  }

  /** Get the most recent N records. */
  getRecent(n: number): LearningRecord[] {
    return this.records.slice(-n);
  }

  /** Total number of records. */
  get size(): number {
    return this.records.length;
  }

  /** Compute calibration metrics from all records. */
  getCalibration(): CalibrationMetrics {
    return computeCalibration([...this.records]);
  }

  /** Count wins and losses. */
  getCounts(): { wins: number; losses: number } {
    const wins = this.records.filter((r) => r.actualResult === "win").length;
    return { wins, losses: this.records.length - wins };
  }

  /** Deterministic replay: given a sequence of records, produces same state. */
  static replay(records: LearningRecord[]): HistoryStore {
    return new HistoryStore(records);
  }
}
