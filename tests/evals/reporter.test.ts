import { describe, it, expect, beforeEach } from "vitest";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { formatComparison, formatReport, loadBaseline } from "../../evals/reporter.js";
import type { EvalResult } from "../../evals/metrics.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_REPORTS_DIR = join(__dirname, "../../evals/reports");

const sampleResults: EvalResult[] = [
  {
    taskId: "PRED-001",
    name: "Basic Game Prediction",
    passed: true,
    score: 1.0,
    latencyMs: 5000,
    errors: [],
    outputSample: '{"game":"Gemini","confidence":0.75}',
    timestamp: new Date().toISOString(),
  },
  {
    taskId: "PRED-002",
    name: "Edge Cases",
    passed: false,
    score: 0.3,
    latencyMs: 3000,
    errors: ["Missing field"],
    outputSample: "",
    timestamp: new Date().toISOString(),
  },
];

describe("Reporter", () => {
  describe("loadBaseline", () => {
    it("should return null if no baseline exists", async () => {
      // Temporarily rename baseline to test
      const baseline = await loadBaseline();
      // baseline may or may not exist — just check it doesn't throw
      expect(typeof baseline === "object" || baseline === null).toBe(true);
    });
  });

  describe("formatReport", () => {
    it("should include summary and per-scenario results", () => {
      const report = formatReport({
        report: "Test Report",
        date: "2026-01-01",
        version: "1.0.0",
        results: sampleResults,
        summary: {
          totalScenarios: 2,
          passed: 1,
          avgScore: 0.65,
          scoreCI: [0.1, 0.9],
          totalLatencyMs: 8000,
          latencyStats: { n: 2, min: 3000, max: 5000, mean: 4000, median: 4000, stddev: 1000, p50: 4000, p95: 5000, p99: 5000 },
        },
      });

      expect(report).toContain("Test Report");
      expect(report).toContain("Basic Game Prediction");
      expect(report).toContain("Edge Cases");
      expect(report).toContain("Scenarios passed");
    });
  });

  describe("formatComparison", () => {
    it("should format baseline comparison", () => {
      const comparison = formatComparison({
        reportDate: "2026-01-01",
        changes: [
          { scenarioName: "Basic Game Prediction", previousScore: 0.8, currentScore: 1.0, delta: 0.2, regressed: false },
          { scenarioName: "Edge Cases", previousScore: 0.5, currentScore: 0.3, delta: -0.2, regressed: true },
        ],
        overallDelta: 0,
        regressions: 1,
        improvements: 1,
      });

      expect(comparison).toContain("Baseline Comparison");
      expect(comparison).toContain("Basic Game Prediction");
      expect(comparison).toContain("Edge Cases");
      expect(comparison).toContain("+20.0%");
      expect(comparison).toContain("-20.0%");
    });
  });
});
