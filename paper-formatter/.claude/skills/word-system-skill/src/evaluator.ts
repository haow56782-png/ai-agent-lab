export interface BinaryCounts {
  truePositive: number;
  predictedPositive: number;
  actualPositive: number;
  correctDecision: number;
  totalDecision: number;
  validWarning: number;
  totalWarning: number;
  matchedRule: number;
  totalRule: number;
  successfulFix: number;
  attemptedFix: number;
  manualOverrideCount: number;
}

export interface EvaluationMetrics {
  precision: number;
  recall: number;
  accuracy: number;
  f1: number;
  warningValidRate: number;
  ruleHitRate: number;
  fixSuccessRate: number;
  manualOverrideRate: number;
}

export interface EvaluationReport extends EvaluationMetrics {
  sampleName: string;
  subsetStats: Record<string, number>;
  failedSamples: Array<{ sampleName: string; reason: string }>;
  warningDetails: unknown[];
  suggestedRules: string[];
  passedReleaseGate: boolean;
}

function safeDivide(numerator: number, denominator: number): number {
  return denominator === 0 ? 1 : numerator / denominator;
}

export function calculateMetrics(counts: BinaryCounts): EvaluationMetrics {
  const precision = safeDivide(counts.truePositive, counts.predictedPositive);
  const recall = safeDivide(counts.truePositive, counts.actualPositive);
  const accuracy = safeDivide(counts.correctDecision, counts.totalDecision);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  return {
    precision,
    recall,
    accuracy,
    f1,
    warningValidRate: safeDivide(counts.validWarning, counts.totalWarning),
    ruleHitRate: safeDivide(counts.matchedRule, counts.totalRule),
    fixSuccessRate: safeDivide(counts.successfulFix, counts.attemptedFix),
    manualOverrideRate: safeDivide(counts.manualOverrideCount, counts.totalDecision),
  };
}

export function buildEvaluationReport(input: {
  sampleName: string;
  counts: BinaryCounts;
  subsetStats: Record<string, number>;
  failedSamples?: Array<{ sampleName: string; reason: string }>;
  warningDetails?: unknown[];
  suggestedRules?: string[];
}): EvaluationReport {
  const metrics = calculateMetrics(input.counts);
  return {
    sampleName: input.sampleName,
    subsetStats: input.subsetStats,
    ...metrics,
    failedSamples: input.failedSamples || [],
    warningDetails: input.warningDetails || [],
    suggestedRules: input.suggestedRules || [],
    passedReleaseGate:
      metrics.f1 >= 0.92 &&
      metrics.warningValidRate >= 0.9 &&
      metrics.fixSuccessRate >= 0.95 &&
      metrics.manualOverrideRate <= 0.1,
  };
}

