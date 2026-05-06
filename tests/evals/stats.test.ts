import { describe, it, expect } from "vitest";
import { mean, variance, stddev, percentile, summarize, wilsonScoreInterval, formatMetricLine } from "../../evals/stats.js";

describe("Stats", () => {
  describe("mean", () => {
    it("should compute average", () => {
      expect(mean([1, 2, 3, 4, 5])).toBe(3);
    });
    it("should return 0 for empty array", () => {
      expect(mean([])).toBe(0);
    });
  });

  describe("variance and stddev", () => {
    it("should compute variance", () => {
      const v = variance([1, 2, 3, 4, 5]);
      expect(v).toBeCloseTo(2, 1); // population variance = 2
    });
    it("should compute stddev", () => {
      const s = stddev([1, 2, 3, 4, 5]);
      expect(s).toBeCloseTo(1.414, 1);
    });
  });

  describe("percentile", () => {
    it("should return correct percentiles", () => {
      const sorted = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      expect(percentile(sorted, 50)).toBe(50);
      // n=10: 95th %ile → ceil(0.95*10)=10 → sorted[9]=100
      expect(percentile(sorted, 95)).toBe(100);
      expect(percentile(sorted, 99)).toBe(100);
    });
  });

  describe("summarize", () => {
    it("should compute all fields", () => {
      const s = summarize([10, 20, 30, 40, 50]);
      expect(s.n).toBe(5);
      expect(s.min).toBe(10);
      expect(s.max).toBe(50);
      expect(s.mean).toBe(30);
      expect(s.median).toBe(30);
      expect(s.stddev).toBeCloseTo(14.14, 0);
    });
    it("should handle empty", () => {
      const s = summarize([]);
      expect(s.n).toBe(0);
      expect(s.min).toBe(0);
    });
  });

  describe("wilsonScoreInterval", () => {
    it("should return 0 for no trials", () => {
      expect(wilsonScoreInterval(0, 0)).toEqual([0, 0]);
    });
    it("should give narrower interval for larger samples", () => {
      const small = wilsonScoreInterval(5, 10);
      const large = wilsonScoreInterval(50, 100);
      // Both have 50% rate, but larger sample has narrower CI
      const smallWidth = small[1] - small[0];
      const largeWidth = large[1] - large[0];
      expect(largeWidth).toBeLessThan(smallWidth);
    });
  });

  describe("formatMetricLine", () => {
    it("should format with CI", () => {
      const line = formatMetricLine("Pass rate", 8, 10);
      expect(line).toContain("Pass rate");
      expect(line).toContain("80.0%");
      expect(line).toContain("CI");
    });
  });
});
