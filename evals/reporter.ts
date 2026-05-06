/**
 * VIB AI — Eval Reporter
 *
 * Persists eval results to disk, compares against baselines,
 * and detects regressions.
 *
 * Report files are stored in evals/reports/run-{timestamp}.json.
 * Baseline is stored in evals/reports/baseline.json.
 */

import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { EvalResult } from "./metrics.js";
import { summarize, formatMetricLine, wilsonScoreInterval } from "./stats.js";
import type { SummaryStats } from "./stats.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPORTS_DIR = join(__dirname, "reports");
const BASELINE_FILE = join(REPORTS_DIR, "baseline.json");

export interface EvalReport {
  report: string;
  date: string;
  version: string;
  results: EvalResult[];
  summary: {
    totalScenarios: number;
    passed: number;
    avgScore: number;
    scoreCI: [number, number];
    totalLatencyMs: number;
    latencyStats: SummaryStats;
  };
}

export interface BaselineComparison {
  reportDate: string;
  changes: Array<{
    scenarioName: string;
    previousScore: number;
    currentScore: number;
    delta: number;
    regressed: boolean;
  }>;
  overallDelta: number;
  regressions: number;
  improvements: number;
}

/** Ensure reports directory exists */
async function ensureReportsDir(): Promise<void> {
  await mkdir(REPORTS_DIR, { recursive: true });
}

/** Save an eval run report */
export async function saveReport(results: EvalResult[]): Promise<EvalReport> {
  await ensureReportsDir();

  const totalCorrect = results.filter((r) => r.passed).length;
  const scoreCI = wilsonScoreInterval(totalCorrect, results.length);
  const latencies = results.map((r) => r.latencyMs);

  const report: EvalReport = {
    report: "VIB AI Agent — Evaluation Report",
    date: new Date().toISOString(),
    version: "1.0.0",
    results,
    summary: {
      totalScenarios: results.length,
      passed: totalCorrect,
      avgScore: results.length > 0 ? results.reduce((s, r) => s + r.score, 0) / results.length : 0,
      scoreCI,
      totalLatencyMs: latencies.reduce((s, l) => s + l, 0),
      latencyStats: summarize(latencies),
    },
  };

  const filename = `run-${Date.now()}.json`;
  await writeFile(join(REPORTS_DIR, filename), JSON.stringify(report, null, 2));

  // Also update baseline
  await writeFile(BASELINE_FILE, JSON.stringify(toBaseline(report), null, 2));

  return report;
}

/** Convert a full report to baseline format */
function toBaseline(report: EvalReport) {
  return {
    report: "VIB AI Agent — Baseline Evaluation",
    date: report.date,
    version: report.version,
    results: report.results.map((r) => ({
      taskId: r.taskId,
      name: r.name,
      passed: r.passed,
      score: r.score,
      latencyMs: r.latencyMs,
    })),
    summary: report.summary,
  };
}

/** Load the current baseline */
export async function loadBaseline(): Promise<EvalReport | null> {
  try {
    const raw = await readFile(BASELINE_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Compare current results against the baseline */
export async function compareBaseline(results: EvalResult[]): Promise<BaselineComparison | null> {
  const baseline = await loadBaseline();
  if (!baseline || baseline.results.length === 0) return null;

  const changes = results.map((current) => {
    const previous = baseline.results.find((r: any) => r.taskId === current.taskId);
    return {
      scenarioName: current.name,
      previousScore: previous?.score ?? 0,
      currentScore: current.score,
      delta: current.score - (previous?.score ?? 0),
      regressed: previous != null && current.score < previous.score - 0.05,
    };
  });

  const overallDelta = baseline.summary
    ? results.reduce((s, r) => s + r.score, 0) / results.length - baseline.summary.avgScore
    : 0;

  return {
    reportDate: baseline.date,
    changes,
    overallDelta,
    regressions: changes.filter((c) => c.regressed).length,
    improvements: changes.filter((c) => c.delta > 0.05).length,
  };
}

/** Format comparison for console output */
export function formatComparison(comparison: BaselineComparison): string {
  const lines: string[] = [
    `── Baseline Comparison ─────────────`,
    `  Baseline date: ${comparison.reportDate}`,
    `  Overall delta: ${(comparison.overallDelta * 100).toFixed(1)}%`,
    `  Regressions:   ${comparison.regressions}`,
    `  Improvements:  ${comparison.improvements}`,
    ``,
    `  Scenario changes:`,
  ];

  for (const c of comparison.changes) {
    const icon = c.regressed ? "❌" : c.delta > 0.05 ? "✅" : "➡️";
    const deltaStr = c.delta >= 0 ? `+${(c.delta * 100).toFixed(1)}%` : `${(c.delta * 100).toFixed(1)}%`;
    lines.push(`    ${icon} ${c.scenarioName}: ${(c.previousScore * 100).toFixed(0)}% → ${(c.currentScore * 100).toFixed(0)}% (${deltaStr})`);
  }

  return lines.join("\n");
}

/** Format a full eval report for console output */
export function formatReport(report: EvalReport): string {
  const lines: string[] = [
    `=== ${report.report} ===`,
    `  Date:     ${report.date}`,
    `  Version:  ${report.version}`,
    ``,
    `── Summary ─────────────────────────`,
    formatMetricLine("Scenarios passed", report.summary.passed, report.summary.totalScenarios),
    `  Average score:               ${(report.summary.avgScore * 100).toFixed(1)}%`,
    `  Total latency:               ${report.summary.totalLatencyMs}ms`,
    ``,
    `── Per-Scenario Results ────────────`,
  ];

  for (const r of report.results) {
    const icon = r.passed ? "✅" : "❌";
    lines.push(`  ${icon} ${r.name}: score=${(r.score * 100).toFixed(0)}%, latency=${r.latencyMs}ms`);
    if (r.errors.length > 0) {
      for (const e of r.errors) lines.push(`      ${e}`);
    }
  }

  return lines.join("\n");
}

/** List all historical run reports */
export async function listReports(): Promise<Array<{ filename: string; date: string }>> {
  try {
    const files = await readdir(REPORTS_DIR);
    const runFiles = files.filter((f) => f.startsWith("run-") && f.endsWith(".json"));
    return runFiles.map((f) => ({
      filename: f,
      date: new Date(Number(f.replace("run-", "").replace(".json", ""))).toISOString(),
    })).sort((a, b) => b.filename.localeCompare(a.filename));
  } catch {
    return [];
  }
}
