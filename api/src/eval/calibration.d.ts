/**
 * VIB AI — Signal Calibration Reporter
 *
 * Evaluates signal prediction accuracy by comparing predicted signals
 * against observed outcomes. Produces CalibrationReports for auditing
 * and model improvement.
 *
 * Usage:
 *   const reporter = new CalibrationReporter();
 *   reporter.record(signal);                          // predict
 *   reporter.observe(sessionId, actualOutcome);        // observe outcome
 *   const report = reporter.generateReport();          // aggregate
 */
export interface SignalRecord {
    id: string;
    sessionId: string;
    provider: string;
    gameAccountId: string;
    predictedAt: string;
    prediction: string;
    confidence: number;
    factors: string[];
    actualOutcome?: string;
    outcomeObservedAt?: string;
    accurate?: boolean;
}
export interface ProviderCalibration {
    provider: string;
    signals: number;
    accuracy: number;
    avgConfidence: number;
}
export interface BucketCalibration {
    bucket: string;
    count: number;
    accuracy: number;
}
export interface CalibrationReport {
    totalSignals: number;
    observedSignals: number;
    overallAccuracy: number;
    avgConfidence: number;
    calibrationError: number;
    byProvider: ProviderCalibration[];
    byConfidenceBucket: BucketCalibration[];
    generatedAt: string;
}
export declare class CalibrationReporter {
    private records;
    /** Record a new signal prediction. */
    record(signal: SignalRecord): void;
    /** Record the actual outcome for a previously-predicted signal. */
    observe(signalId: string, actualOutcome: string): boolean;
    /** Get a specific signal record. */
    getRecord(signalId: string): SignalRecord | undefined;
    /** Get all records. */
    getAllRecords(): SignalRecord[];
    /** Get records with observed outcomes. */
    getObservedRecords(): SignalRecord[];
    /** Generate the calibration report from all observed records. */
    generateReport(): CalibrationReport;
    /** Clear all records. */
    clear(): void;
}
/** Format a calibration report as a human-readable string. */
export declare function formatCalibrationReport(report: CalibrationReport): string;
//# sourceMappingURL=calibration.d.ts.map