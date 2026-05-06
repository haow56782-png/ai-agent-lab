import { describe, it, expect } from "vitest";
import { computeCalibration, parseConfidenceFromOutput, formatCalibration } from "../../evals/calibration.js";

describe("Calibration", () => {
  describe("computeCalibration", () => {
    it("should return empty for no points", () => {
      const result = computeCalibration([]);
      expect(result.totalPredictions).toBe(0);
      expect(result.ece).toBe(0);
    });

    it("should compute approximately perfect calibration", () => {
      // Confidence ~80% → ~80% correct, ~20% → ~20% correct
      const points = [
        // 10 predictions at 80% confidence: 8 correct (80% ≈ calibrated)
        ...Array.from({ length: 8 }, () => ({ predictedConfidence: 0.8, actualOutcome: 1 })),
        ...Array.from({ length: 2 }, () => ({ predictedConfidence: 0.8, actualOutcome: 0 })),
        // 10 predictions at 20% confidence: 2 correct (20% ≈ calibrated)
        ...Array.from({ length: 2 }, () => ({ predictedConfidence: 0.2, actualOutcome: 1 })),
        ...Array.from({ length: 8 }, () => ({ predictedConfidence: 0.2, actualOutcome: 0 })),
      ];
      const result = computeCalibration(points, 10);
      expect(result.totalPredictions).toBe(20);
      expect(result.overallAccuracy).toBeCloseTo(0.5, 1);
      expect(result.ece).toBeLessThan(0.05);
    });

    it("should detect miscalibration", () => {
      // Overconfident: predicted 0.9 but always wrong
      const points = Array.from({ length: 10 }, () => ({
        predictedConfidence: 0.9,
        actualOutcome: 0,
      }));
      const result = computeCalibration(points);
      expect(result.ece).toBeGreaterThan(0.8);
      expect(result.brierScore).toBeGreaterThan(0.8);
    });

    it("should compute Brier score", () => {
      const points = [
        { predictedConfidence: 1.0, actualOutcome: 1 },
        { predictedConfidence: 0.0, actualOutcome: 0 },
      ];
      const result = computeCalibration(points);
      expect(result.brierScore).toBeCloseTo(0, 1);
    });
  });

  describe("parseConfidenceFromOutput", () => {
    it("should parse confidence from JSON", () => {
      const output = '{"game":"Gemini","confidence":0.75,"prediction":"HIGH"}';
      expect(parseConfidenceFromOutput(output)).toBe(0.75);
    });

    it("should parse from markdown-wrapped JSON", () => {
      const output = '```json\n{"game":"Gemini","confidence":0.42}\n```';
      expect(parseConfidenceFromOutput(output)).toBe(0.42);
    });

    it("should return null if no confidence found", () => {
      expect(parseConfidenceFromOutput("no confidence here")).toBeNull();
    });
  });

  describe("formatCalibration", () => {
    it("should return human-readable output", () => {
      const cal = computeCalibration([
        { predictedConfidence: 0.7, actualOutcome: 1 },
        { predictedConfidence: 0.3, actualOutcome: 0 },
      ]);
      const formatted = formatCalibration(cal);
      expect(formatted).toContain("Calibration");
      expect(formatted).toContain("ECE");
      expect(formatted).toContain("Brier");
    });
  });
});
