import { describe, it, expect } from "vitest";
import {
  loadAllFixtures,
  loadFixturesByCategory,
  runFixtureRegression,
  formatFixtureReport,
} from "../../evals/fixtures/index.js";

describe("Eval Fixtures", () => {
  describe("loadAllFixtures", () => {
    it("should load fixtures from all 4 categories", async () => {
      const fixtures = await loadAllFixtures();
      expect(fixtures.length).toBeGreaterThanOrEqual(12);
    });

    it("should include prediction-success fixtures", async () => {
      const fixtures = await loadFixturesByCategory("prediction-success");
      expect(fixtures.length).toBeGreaterThanOrEqual(3);
      for (const f of fixtures) {
        expect(f.category).toBe("prediction-success");
      }
    });

    it("should include prediction-failure fixtures", async () => {
      const fixtures = await loadFixturesByCategory("prediction-failure");
      expect(fixtures.length).toBeGreaterThanOrEqual(3);
      for (const f of fixtures) {
        expect(f.category).toBe("prediction-failure");
      }
    });

    it("should include empty-results fixtures", async () => {
      const fixtures = await loadFixturesByCategory("empty-results");
      expect(fixtures.length).toBeGreaterThanOrEqual(3);
      for (const f of fixtures) {
        expect(f.category).toBe("empty-results");
      }
    });

    it("should include baseline-comparison fixtures", async () => {
      const fixtures = await loadFixturesByCategory("baseline-comparison");
      expect(fixtures.length).toBeGreaterThanOrEqual(3);
      for (const f of fixtures) {
        expect(f.category).toBe("baseline-comparison");
      }
    });

    it("should return empty for unknown category", async () => {
      const fixtures = await loadFixturesByCategory("nonexistent");
      expect(fixtures).toEqual([]);
    });
  });

  describe("fixture schema", () => {
    it("each fixture should have all required fields with valid types", async () => {
      const fixtures = await loadAllFixtures();
      for (const f of fixtures) {
        expect(f.id).toBeTruthy();
        expect(typeof f.taskId).toBe("string");
        expect(f.taskId.length).toBeGreaterThan(0);
        expect(typeof f.input).toBe("string");
        expect(
          f.expectedOutput !== undefined || f.expectedBehavior !== undefined,
        ).toBe(true);
        expect(typeof f.score).toBe("number");
        expect(f.score).toBeGreaterThanOrEqual(0);
        expect(f.score).toBeLessThanOrEqual(1);
        expect(typeof f.confidence).toBe("number");
        expect(f.confidence).toBeGreaterThanOrEqual(0);
        expect(f.confidence).toBeLessThanOrEqual(1);
        expect(typeof f.actualOutcome).toBe("string");
        expect(Array.isArray(f.tags)).toBe(true);
        expect(f.tags.length).toBeGreaterThan(0);
      }
    });
  });

  describe("runFixtureRegression", () => {
    it("should produce a complete report with all fixtures counted", async () => {
      const allFixtures = await loadAllFixtures();
      const report = await runFixtureRegression();
      expect(report.totalFixtures).toBe(allFixtures.length);
      expect(report.passed + report.failed).toBe(report.totalFixtures);
      expect(report.results.length).toBe(report.totalFixtures);
    });

    it("should not produce NaN in summary stats for empty results", async () => {
      const report = await runFixtureRegression();
      expect(report.summary.emptyResultChecks.nanFree).toBe(
        report.summary.emptyResultChecks.total,
      );
    });

    it("should detect non-PRED taskIds for calibration exclusion", async () => {
      const report = await runFixtureRegression();
      expect(report.summary.calibrationChecks.nonPredExcluded).toBeGreaterThanOrEqual(
        1,
      );
    });

    it("should enforce minimum 3 calibration points before showing chart", async () => {
      const report = await runFixtureRegression();
      expect(
        report.summary.calibrationChecks.minPointsEnforced,
      ).toBeGreaterThanOrEqual(1);
    });

    it("should pass all fixtures (zero regressions)", async () => {
      const report = await runFixtureRegression();
      expect(report.failed).toBe(0);
    });
  });

  describe("formatFixtureReport", () => {
    it("should include summary and all category results", async () => {
      const report = await runFixtureRegression();
      const formatted = formatFixtureReport(report);
      expect(formatted).toContain("Fixture Regression Report");
      expect(formatted).toContain("Sanitization Checks");
      expect(formatted).toContain("prediction-success");
      expect(formatted).toContain("prediction-failure");
      expect(formatted).toContain("empty-results");
      expect(formatted).toContain("baseline-comparison");
    });
  });

  describe("regression baseline", () => {
    it("should produce deterministic results across runs", async () => {
      const report1 = await runFixtureRegression();
      const report2 = await runFixtureRegression();
      expect(report1.totalFixtures).toBe(report2.totalFixtures);
      expect(report1.passed).toBe(report2.passed);
      expect(report1.summary.avgScore).toBe(report2.summary.avgScore);
    });
  });
});
