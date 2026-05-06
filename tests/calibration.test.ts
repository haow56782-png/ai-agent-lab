import { describe, it, expect } from "vitest";
import {
  CalibrationReporter,
  formatCalibrationReport,
} from "../src/eval/calibration.js";
import type { SignalRecord } from "../src/eval/calibration.js";

function makeSignal(overrides: Partial<SignalRecord> = {}): SignalRecord {
  return {
    id: "sig_001",
    sessionId: "sess_001",
    provider: "PG_SOFT",
    gameAccountId: "acc_001",
    predictedAt: new Date().toISOString(),
    prediction: "HIGH_PROBABILITY",
    confidence: 0.8,
    factors: ["factor_1"],
    ...overrides,
  };
}

describe("CalibrationReporter", () => {
  describe("record + observe", () => {
    it("should record a signal", () => {
      const r = new CalibrationReporter();
      r.record(makeSignal());

      const got = r.getRecord("sig_001");
      expect(got).toBeDefined();
      expect(got!.prediction).toBe("HIGH_PROBABILITY");
    });

    it("should observe outcome and mark accuracy", () => {
      const r = new CalibrationReporter();
      r.record(makeSignal({ id: "sig_001", prediction: "TREND_UP" }));
      const ok = r.observe("sig_001", "TREND_UP");

      expect(ok).toBe(true);
      const got = r.getRecord("sig_001")!;
      expect(got.actualOutcome).toBe("TREND_UP");
      expect(got.accurate).toBe(true);
      expect(got.outcomeObservedAt).toBeDefined();
    });

    it("should mark inaccurate when prediction != outcome", () => {
      const r = new CalibrationReporter();
      r.record(makeSignal({ id: "sig_001", prediction: "TREND_UP" }));
      r.observe("sig_001", "TREND_DOWN");

      expect(r.getRecord("sig_001")!.accurate).toBe(false);
    });

    it("should return false when observing unknown signal", () => {
      const r = new CalibrationReporter();
      expect(r.observe("unknown", "OUTCOME")).toBe(false);
    });
  });

  describe("generateReport", () => {
    it("should return zeroes with no observed signals", () => {
      const r = new CalibrationReporter();
      r.record(makeSignal({ id: "sig_001" }));

      const report = r.generateReport();
      expect(report.totalSignals).toBe(1);
      expect(report.observedSignals).toBe(0);
      expect(report.overallAccuracy).toBe(0);
    });

    it("should calculate overall accuracy", () => {
      const r = new CalibrationReporter();
      r.record(makeSignal({ id: "sig_001", prediction: "A" }));
      r.record(makeSignal({ id: "sig_002", prediction: "B" }));
      r.record(makeSignal({ id: "sig_003", prediction: "A" }));
      r.record(makeSignal({ id: "sig_004", prediction: "B" }));

      r.observe("sig_001", "A"); // correct
      r.observe("sig_002", "B"); // correct
      r.observe("sig_003", "B"); // wrong
      // sig_004 not observed

      const report = r.generateReport();
      expect(report.totalSignals).toBe(4);
      expect(report.observedSignals).toBe(3);
      expect(report.overallAccuracy).toBeCloseTo(2 / 3);
    });

    it("should calculate avg confidence", () => {
      const r = new CalibrationReporter();
      r.record(makeSignal({ id: "sig_001", confidence: 0.8 }));
      r.record(makeSignal({ id: "sig_002", confidence: 0.6 }));
      r.observe("sig_001", "SOME");
      r.observe("sig_002", "SOME");

      const report = r.generateReport();
      expect(report.avgConfidence).toBe(0.7);
    });

    it("should calculate calibration error", () => {
      const r = new CalibrationReporter();
      // All predictions correct, confidence 0.7
      r.record(makeSignal({ id: "sig_001", prediction: "A", confidence: 0.7 }));
      r.record(makeSignal({ id: "sig_002", prediction: "B", confidence: 0.7 }));
      r.observe("sig_001", "A");
      r.observe("sig_002", "B");

      const report = r.generateReport();
      // accuracy=1.0, avgConfidence=0.7, error=|0.7-1.0|=0.3
      expect(report.calibrationError).toBe(0.3);
    });

    it("should group by provider", () => {
      const r = new CalibrationReporter();
      r.record(makeSignal({ id: "sig_001", provider: "PG_SOFT", prediction: "A", confidence: 0.8 }));
      r.record(makeSignal({ id: "sig_002", provider: "JILI", prediction: "B", confidence: 0.7 }));
      r.observe("sig_001", "A");
      r.observe("sig_002", "B");

      const report = r.generateReport();
      expect(report.byProvider).toHaveLength(2);
      const pg = report.byProvider.find((p) => p.provider === "PG_SOFT")!;
      expect(pg.signals).toBe(1);
      expect(pg.accuracy).toBe(1);
    });

    it("should group by confidence bucket", () => {
      const r = new CalibrationReporter();
      r.record(makeSignal({ id: "sig_001", confidence: 0.65, prediction: "A" }));
      r.record(makeSignal({ id: "sig_002", confidence: 0.72, prediction: "B" }));
      r.record(makeSignal({ id: "sig_003", confidence: 0.81, prediction: "C" }));
      r.observe("sig_001", "A");
      r.observe("sig_002", "B");
      r.observe("sig_003", "C");

      const report = r.generateReport();
      expect(report.byConfidenceBucket.length).toBeGreaterThanOrEqual(2);
      const b6 = report.byConfidenceBucket.find((b) => b.bucket.startsWith("0.6"));
      expect(b6).toBeDefined();
    });
  });

  describe("formatCalibrationReport", () => {
    it("should produce human-readable output", () => {
      const r = new CalibrationReporter();
      r.record(makeSignal({ id: "sig_001", prediction: "A", confidence: 0.8 }));
      r.observe("sig_001", "A");

      const text = formatCalibrationReport(r.generateReport());
      expect(text).toContain("Calibration Report");
      expect(text).toContain("Overall Accuracy");
      expect(text).toContain("Calibration Error");
    });
  });

  describe("clear", () => {
    it("should remove all records", () => {
      const r = new CalibrationReporter();
      r.record(makeSignal({ id: "sig_001" }));
      r.clear();
      expect(r.getAllRecords()).toHaveLength(0);
    });
  });
});
