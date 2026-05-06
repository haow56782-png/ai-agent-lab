/**
 * Eval Fixtures — standardized regression test samples
 *
 * Fixtures are self-contained test cases that validate the evaluation pipeline
 * without requiring real LLM calls. Each fixture defines input data, expected
 * outcomes, and metadata for regression tracking.
 *
 * Usage:
 *   npm run dev eval fixtures
 */

import type { EvalResult } from "../metrics.js";
import { mean, summarize, formatMetricLine } from "../stats.js";
import { computeCalibration, parseConfidenceFromOutput } from "../calibration.js";

export interface EvalFixture {
  /** Unique identifier (e.g. "PRED-SUCCESS-001") */
  id: string;
  /** Task ID with domain prefix (PRED, DS, etc.) */
  taskId: string;
  /** Classification category */
  category: "prediction-success" | "prediction-failure" | "empty-results" | "baseline-comparison";
  /** Input that would be sent to the agent */
  input: string;
  /** Expected output text (for exact/semantic match regressions) */
  expectedOutput?: string;
  /** Description of expected behavior */
  expectedBehavior: string;
  /** Expected score 0.0–1.0 */
  score: number;
  /** Confidence value 0.0–1.0 */
  confidence: number;
  /** Actual/simulated outcome description */
  actualOutcome: string;
  /** Tags for filtering and categorization */
  tags: string[];
}

export interface FixtureRegressionReport {
  date: string;
  totalFixtures: number;
  passed: number;
  failed: number;
  skipped: number;
  results: Array<{
    id: string;
    category: string;
    passed: boolean;
    errors: string[];
    score: number;
  }>;
  summary: {
    regressionRate: number;
    avgScore: number;
    emptyResultChecks: { total: number; nanFree: number };
    calibrationChecks: { nonPredExcluded: number; minPointsEnforced: number };
  };
}

// Category registry
const fixtureLoaders: Record<string, () => Promise<EvalFixture[]>> = {
  "prediction-success": () => import("./prediction-success.js").then((m) => m.predictionSuccessFixtures),
  "prediction-failure": () => import("./prediction-failure.js").then((m) => m.predictionFailureFixtures),
  "empty-results": () => import("./empty-results.js").then((m) => m.emptyResultFixtures),
  "baseline-comparison": () => import("./baseline-comparison.js").then((m) => m.baselineComparisonFixtures),
};

export async function loadAllFixtures(): Promise<EvalFixture[]> {
  const all: EvalFixture[] = [];
  for (const loader of Object.values(fixtureLoaders)) {
    const fixtures = await loader();
    all.push(...fixtures);
  }
  return all;
}

export async function loadFixturesByCategory(category: string): Promise<EvalFixture[]> {
  const loader = fixtureLoaders[category];
  if (!loader) return [];
  return loader();
}

/**
 * Run fixture-based regression checks.
 * Validates the evaluation pipeline produces correct results for known inputs
 * without calling any real LLM API.
 */
export async function runFixtureRegression(): Promise<FixtureRegressionReport> {
  const allFixtures = await loadAllFixtures();
  const results: FixtureRegressionReport["results"] = [];

  let emptyChecksTotal = 0;
  let emptyChecksNanFree = 0;
  let nonPredExcluded = 0;
  let minPointsEnforced = 0;

  for (const fixture of allFixtures) {
    const errors: string[] = [];

    // Generic schema checks
    if (typeof fixture.score !== "number" || isNaN(fixture.score) || fixture.score < 0 || fixture.score > 1) {
      errors.push(`Invalid score: ${fixture.score}`);
    }
    if (typeof fixture.confidence !== "number" || isNaN(fixture.confidence) || fixture.confidence < 0 || fixture.confidence > 1) {
      errors.push(`Invalid confidence: ${fixture.confidence}`);
    }
    if (!fixture.taskId || fixture.taskId.trim().length === 0) {
      errors.push("Empty taskId");
    }
    if (typeof fixture.input !== "string") {
      errors.push("Input must be a string");
    }

    // Empty-results checks: NaN regression
    if (fixture.category === "empty-results") {
      emptyChecksTotal++;
      const stats = summarize([fixture.score]);
      if (isNaN(stats.mean) || isNaN(stats.stddev) || !isFinite(stats.mean)) {
        errors.push("NaN detected in summary stats for empty result");
      } else {
        emptyChecksNanFree++;
      }
    }

    // Prediction checks: taskId prefix determines calibration eligibility
    if (fixture.category === "prediction-success" || fixture.category === "prediction-failure") {
      if (!fixture.taskId.startsWith("PRED")) {
        nonPredExcluded++;
      }

      // Verify confidence is parseable from expectedOutput if it contains JSON
      if (fixture.expectedOutput && fixture.expectedOutput.includes("confidence")) {
        const parsed = parseConfidenceFromOutput(fixture.expectedOutput);
        if (parsed === null) {
          errors.push("Confidence field present in output but parseConfidenceFromOutput returned null");
        }
      }
    }

    // Baseline checks: internal consistency
    if (fixture.category === "baseline-comparison") {
      if (fixture.actualOutcome === "SUCCESS" && fixture.score < 0.5) {
        errors.push(`SUCCESS outcome but score ${fixture.score} < 0.5`);
      }
      if (fixture.actualOutcome === "FAILURE" && fixture.score > 0.5) {
        errors.push(`FAILURE outcome but score ${fixture.score} > 0.5`);
      }
    }

    // Calibration minimum points: < 3 points should not produce chart
    const calPoints = [
      { predictedConfidence: 0.5, actualOutcome: 1 },
      { predictedConfidence: 0.6, actualOutcome: 0 },
    ];
    const calResult = computeCalibration(calPoints);
    if (calResult.totalPredictions >= 3) {
      errors.push(`Calibration with 2 points should have totalPredictions < 3, got ${calResult.totalPredictions}`);
    } else {
      minPointsEnforced++;
    }

    // NaN regression: summarize([]) must not produce NaN
    const emptyStats = summarize([]);
    if (isNaN(emptyStats.mean) || isNaN(emptyStats.stddev) || !isFinite(emptyStats.mean)) {
      errors.push("summarize([]) produced NaN");
    }

    results.push({
      id: fixture.id,
      category: fixture.category,
      passed: errors.length === 0,
      errors,
      score: fixture.score,
    });
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  const report: FixtureRegressionReport = {
    date: new Date().toISOString(),
    totalFixtures: allFixtures.length,
    passed,
    failed,
    skipped: 0,
    results,
    summary: {
      regressionRate: allFixtures.length > 0 ? failed / allFixtures.length : 0,
      avgScore: results.length > 0 ? mean(results.map((r) => r.score)) : 0,
      emptyResultChecks: { total: emptyChecksTotal, nanFree: emptyChecksNanFree },
      calibrationChecks: { nonPredExcluded, minPointsEnforced },
    },
  };

  return report;
}

export function formatFixtureReport(report: FixtureRegressionReport): string {
  const lines: string[] = [
    `=== Fixture Regression Report ===`,
    `  Date:     ${report.date}`,
    `  Total:    ${report.totalFixtures}`,
    `  Passed:   ${report.passed}`,
    `  Failed:   ${report.failed}`,
    `  Skipped:  ${report.skipped}`,
    formatMetricLine("Regression rate", report.totalFixtures - report.failed, report.totalFixtures),
    `  Avg Score: ${(report.summary.avgScore * 100).toFixed(1)}%`,
    ``,
    `── Sanitization Checks ───────────`,
    `  NaN-free empty results: ${report.summary.emptyResultChecks.nanFree}/${report.summary.emptyResultChecks.total}`,
    `  Non-PRED excluded:      ${report.summary.calibrationChecks.nonPredExcluded}`,
    `  Min calibration points:  ${report.summary.calibrationChecks.minPointsEnforced} enforced`,
    ``,
    `── Per-Fixture Results ─────────`,
  ];

  for (const r of report.results) {
    const icon = r.passed ? "✓" : "✗";
    lines.push(`  ${icon} [${r.category}] ${r.id}: score=${(r.score * 100).toFixed(0)}%`);
    if (r.errors.length > 0) {
      for (const e of r.errors) lines.push(`       ${e}`);
    }
  }

  return lines.join("\n");
}
