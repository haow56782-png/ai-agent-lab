import assert from 'node:assert/strict';
import { buildEvaluationReport, calculateMetrics } from '../src/evaluator.ts';
import { generateJsonReport, generateMarkdownReport } from '../src/report-generator.ts';

const metrics = calculateMetrics({
  truePositive: 98,
  predictedPositive: 100,
  actualPositive: 100,
  correctDecision: 99,
  totalDecision: 100,
  validWarning: 9,
  totalWarning: 10,
  matchedRule: 19,
  totalRule: 20,
  successfulFix: 95,
  attemptedFix: 100,
  manualOverrideCount: 5,
});

assert.equal(metrics.precision, 0.98);
assert.equal(metrics.recall, 0.98);
assert.equal(metrics.f1, 0.98);
assert.equal(metrics.warningValidRate, 0.9);

const report = buildEvaluationReport({
  sampleName: 'p0-basic-thesis',
  counts: {
    truePositive: 98,
    predictedPositive: 100,
    actualPositive: 100,
    correctDecision: 99,
    totalDecision: 100,
    validWarning: 9,
    totalWarning: 10,
    matchedRule: 19,
    totalRule: 20,
    successfulFix: 95,
    attemptedFix: 100,
    manualOverrideCount: 5,
  },
  subsetStats: { headings: 12, tables: 3 },
});

assert.equal(report.passedReleaseGate, true);
assert.match(generateJsonReport(report), /"sampleName": "p0-basic-thesis"/);
assert.match(generateMarkdownReport(report), /Precision: 0.9800/);

console.log('evaluator.test.ts passed');

