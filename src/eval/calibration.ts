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

// ─── Types ─────────────────────────────────────────

export interface SignalRecord {
  id: string;
  sessionId: string;
  provider: string;
  gameAccountId: string;
  predictedAt: string;
  prediction: string;
  confidence: number;        // 0.0–1.0
  factors: string[];
  actualOutcome?: string;
  outcomeObservedAt?: string;
  accurate?: boolean;
}

export interface ProviderCalibration {
  provider: string;
  signals: number;
  accuracy: number;          // 0.0–1.0
  avgConfidence: number;     // 0.0–1.0
}

export interface BucketCalibration {
  bucket: string;            // e.g. "0.6-0.7"
  count: number;
  accuracy: number;
}

export interface CalibrationReport {
  totalSignals: number;
  observedSignals: number;    // signals with outcome recorded
  overallAccuracy: number;
  avgConfidence: number;
  calibrationError: number;   // |avgConfidence - accuracy|
  byProvider: ProviderCalibration[];
  byConfidenceBucket: BucketCalibration[];
  generatedAt: string;
}

// ─── Reporter ──────────────────────────────────────

export class CalibrationReporter {
  private records: Map<string, SignalRecord> = new Map();

  /** Record a new signal prediction. */
  record(signal: SignalRecord): void {
    this.records.set(signal.id, { ...signal });
  }

  /** Record the actual outcome for a previously-predicted signal. */
  observe(signalId: string, actualOutcome: string): boolean {
    const record = this.records.get(signalId);
    if (!record) return false;
    record.actualOutcome = actualOutcome;
    record.outcomeObservedAt = new Date().toISOString();
    record.accurate = record.prediction === actualOutcome;
    return true;
  }

  /** Get a specific signal record. */
  getRecord(signalId: string): SignalRecord | undefined {
    return this.records.get(signalId);
  }

  /** Get all records. */
  getAllRecords(): SignalRecord[] {
    return Array.from(this.records.values());
  }

  /** Get records with observed outcomes. */
  getObservedRecords(): SignalRecord[] {
    return this.getAllRecords().filter((r) => r.accurate !== undefined);
  }

  /** Generate the calibration report from all observed records. */
  generateReport(): CalibrationReport {
    const observed = this.getObservedRecords();
    const totalSignals = this.records.size;
    const observedSignals = observed.length;

    // Overall metrics
    const overallAccuracy =
      observedSignals > 0
        ? observed.filter((r) => r.accurate).length / observedSignals
        : 0;

    const avgConfidence =
      observedSignals > 0
        ? observed.reduce((s, r) => s + r.confidence, 0) / observedSignals
        : 0;

    // By provider
    const byProviderMap = new Map<string, SignalRecord[]>();
    for (const r of observed) {
      const list = byProviderMap.get(r.provider) ?? [];
      list.push(r);
      byProviderMap.set(r.provider, list);
    }
    const byProvider: ProviderCalibration[] = Array.from(
      byProviderMap.entries(),
    ).map(([provider, list]) => ({
      provider,
      signals: list.length,
      accuracy: list.filter((r) => r.accurate).length / list.length,
      avgConfidence: list.reduce((s, r) => s + r.confidence, 0) / list.length,
    }));

    // By confidence bucket
    const buckets = new Map<string, SignalRecord[]>();
    for (const r of observed) {
      const bucket = confidenceBucket(r.confidence);
      const list = buckets.get(bucket) ?? [];
      list.push(r);
      buckets.set(bucket, list);
    }
    const byConfidenceBucket: BucketCalibration[] = Array.from(
      buckets.entries(),
    )
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([bucket, list]) => ({
        bucket,
        count: list.length,
        accuracy: list.filter((r) => r.accurate).length / list.length,
      }));

    return {
      totalSignals,
      observedSignals,
      overallAccuracy,
      avgConfidence: Math.round(avgConfidence * 100) / 100,
      calibrationError:
        observedSignals > 0
          ? Math.round(Math.abs(avgConfidence - overallAccuracy) * 100) / 100
          : 0,
      byProvider,
      byConfidenceBucket,
      generatedAt: new Date().toISOString(),
    };
  }

  /** Clear all records. */
  clear(): void {
    this.records.clear();
  }
}

// ─── Helpers ───────────────────────────────────────

function confidenceBucket(confidence: number): string {
  const lower = Math.floor(confidence * 10) / 10;
  const upper = Math.round((lower + 0.1) * 10) / 10;
  return `${lower.toFixed(1)}-${upper.toFixed(1)}`;
}

/** Format a calibration report as a human-readable string. */
export function formatCalibrationReport(report: CalibrationReport): string {
  const lines: string[] = [
    `── Signal Calibration Report ────────`,
    `  Generated:      ${report.generatedAt}`,
    `  Total Signals:  ${report.totalSignals}`,
    `  Observed:       ${report.observedSignals}`,
    ``,
    `  Overall Accuracy:    ${(report.overallAccuracy * 100).toFixed(1)}%`,
    `  Avg Confidence:      ${(report.avgConfidence * 100).toFixed(1)}%`,
    `  Calibration Error:   ${(report.calibrationError * 100).toFixed(1)}%`,
  ];

  if (report.byProvider.length > 0) {
    lines.push(``, `── By Provider ────────────────────────`);
    for (const p of report.byProvider) {
      lines.push(
        `  ${p.provider.padEnd(16)} ${p.signals} signals, ` +
          `${(p.accuracy * 100).toFixed(0)}% acc, ` +
          `${(p.avgConfidence * 100).toFixed(0)}% conf`,
      );
    }
  }

  if (report.byConfidenceBucket.length > 0) {
    lines.push(``, `── By Confidence Bucket ───────────────`);
    for (const b of report.byConfidenceBucket) {
      lines.push(
        `  conf ${b.bucket.padEnd(7)} ${b.count} samples, ${(b.accuracy * 100).toFixed(0)}% acc`,
      );
    }
  }

  return lines.join("\n");
}
