import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { EvaluationReport } from './evaluator.ts';

export function generateJsonReport(report: EvaluationReport): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}

export function generateMarkdownReport(report: EvaluationReport): string {
  const failed = report.failedSamples.length
    ? report.failedSamples.map(item => `- ${item.sampleName}: ${item.reason}`).join('\n')
    : '- 无';
  const warnings = report.warningDetails.length
    ? report.warningDetails.map(item => `- ${JSON.stringify(item)}`).join('\n')
    : '- 无';

  return [
    `# Word System Eval Report`,
    ``,
    `## Sample`,
    ``,
    `- 样本名称: ${report.sampleName}`,
    `- 是否通过上线门槛: ${report.passedReleaseGate ? '通过' : '未通过'}`,
    ``,
    `## Metrics`,
    ``,
    `- Precision: ${report.precision.toFixed(4)}`,
    `- Recall: ${report.recall.toFixed(4)}`,
    `- Accuracy: ${report.accuracy.toFixed(4)}`,
    `- F1: ${report.f1.toFixed(4)}`,
    `- Warning Valid Rate: ${report.warningValidRate.toFixed(4)}`,
    `- Rule Hit Rate: ${report.ruleHitRate.toFixed(4)}`,
    `- Fix Success Rate: ${report.fixSuccessRate.toFixed(4)}`,
    `- Manual Override Rate: ${report.manualOverrideRate.toFixed(4)}`,
    ``,
    `## Failed Samples`,
    ``,
    failed,
    ``,
    `## Warning Details`,
    ``,
    warnings,
    ``,
    `## Suggested Rules`,
    ``,
    report.suggestedRules.length ? report.suggestedRules.map(rule => `- ${rule}`).join('\n') : '- 无',
    ``,
  ].join('\n');
}

export function writeEvaluationReports(report: EvaluationReport, jsonPath: string, markdownPath: string): void {
  mkdirSync(dirname(jsonPath), { recursive: true });
  mkdirSync(dirname(markdownPath), { recursive: true });
  writeFileSync(jsonPath, generateJsonReport(report));
  writeFileSync(markdownPath, generateMarkdownReport(report));
}

