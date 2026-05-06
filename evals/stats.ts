/**
 * VIB AI — Statistical Utilities
 *
 * Functions for computing summary statistics, confidence intervals,
 * and distribution metrics on eval results.
 */

export interface SummaryStats {
  n: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  stddev: number;
  p50: number;
  p95: number;
  p99: number;
}

export function mean(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;
}

export function variance(values: number[]): number {
  const m = mean(values);
  return values.length === 0 ? 0 : values.reduce((sum, v) => sum + (v - m) ** 2, 0) / values.length;
}

export function stddev(values: number[]): number {
  return Math.sqrt(variance(values));
}

export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.max(0, Math.min(Math.ceil((p / 100) * sorted.length) - 1, sorted.length - 1));
  return sorted[idx]!;
}

export function summarize(values: number[]): SummaryStats {
  if (values.length === 0) {
    return { n: 0, min: 0, max: 0, mean: 0, median: 0, stddev: 0, p50: 0, p95: 0, p99: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  return {
    n: values.length,
    min: sorted[0]!,
    max: sorted[sorted.length - 1]!,
    mean: mean(values),
    median: percentile(sorted, 50),
    stddev: stddev(values),
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
  };
}

/**
 * Wilson score confidence interval for a proportion.
 * Returns [lower, upper] bounds at the given z-score (1.96 ≈ 95% confidence).
 */
export function wilsonScoreInterval(positive: number, total: number, z = 1.96): [number, number] {
  if (total === 0) return [0, 0];
  const p = positive / total;
  const z2 = z * z;
  const denominator = 1 + z2 / total;
  const center = (p + z2 / (2 * total)) / denominator;
  const margin = (z / denominator) * Math.sqrt((p * (1 - p) + z2 / (4 * total)) / total);
  return [
    Math.max(0, center - margin),
    Math.min(1, center + margin),
  ];
}

/** Format a summary + confidence interval as a human-readable line */
export function formatMetricLine(label: string, positive: number, total: number): string {
  const pct = total > 0 ? ((positive / total) * 100).toFixed(1) : "—";
  const [lo, hi] = wilsonScoreInterval(positive, total);
  return `  ${label}: ${positive}/${total} (${pct}%) [${(lo * 100).toFixed(1)}–${(hi * 100).toFixed(1)}% 95% CI]`;
}

/** Format a numeric distribution summary */
export function formatDistribution(label: string, values: number[]): string {
  const s = summarize(values);
  return [
    `  ${label}:`,
    `    n        = ${s.n}`,
    `    min      = ${s.min}`,
    `    max      = ${s.max}`,
    `    mean     = ${s.mean.toFixed(1)}`,
    `    median   = ${s.median.toFixed(1)}`,
    `    stddev   = ${s.stddev.toFixed(1)}`,
    `    p50/p95  = ${s.p50}/${s.p95}`,
  ].join("\n");
}
