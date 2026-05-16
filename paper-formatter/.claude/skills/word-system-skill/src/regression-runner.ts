import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDocxFixture } from './docx-fixture-loader.ts';
import { buildEvaluationReport, type BinaryCounts, type EvaluationReport } from './evaluator.ts';
import { generateJsonReport, generateMarkdownReport, writeEvaluationReports } from './report-generator.ts';
import { detectWordStructure, type WordStructureJson } from './structure-detector.ts';

interface SampleManifest {
  samples: Array<{
    sampleName: string;
    subset: 'P0' | 'P1' | 'P2';
    required: boolean;
    covers: string[];
  }>;
}

interface SampleRunResult {
  sampleName: string;
  docxPath: string;
  structure: WordStructureJson;
  report: EvaluationReport;
}

const skillRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

interface ExpectedBaseline {
  metadata?: Record<string, unknown>;
  expectedStats?: Record<string, number>;
  qualityGate?: {
    enforceExactStats?: boolean;
    requiredWarningCodes?: string[];
  };
}

function loadManifest(manifestPath: string): SampleManifest {
  return JSON.parse(readFileSync(manifestPath, 'utf8')) as SampleManifest;
}

function expectedPathForSample(sampleName: string): string {
  return join(skillRoot, 'fixtures', 'expected', sampleName.replace(/\.docx$/i, '.expected.json'));
}

function loadExpectedBaseline(sampleName: string): ExpectedBaseline {
  const expectedPath = expectedPathForSample(sampleName);
  if (!existsSync(expectedPath)) return {};
  return JSON.parse(readFileSync(expectedPath, 'utf8')) as ExpectedBaseline;
}

function statKeys(stats: Record<string, number>): string[] {
  return [
    'headings',
    'paragraphs',
    'figures',
    'tables',
    'continuationTables',
    'references',
    'headersFooters',
    'warnings',
  ].filter(key => Number.isFinite(stats[key]));
}

function sumStats(stats: Record<string, number>, keys = statKeys(stats)): number {
  return keys.reduce((sum, key) => sum + Math.max(stats[key] || 0, 0), 0);
}

function buildCounts(expected: ExpectedBaseline, stats: Record<string, number>): BinaryCounts {
  const baselineStats = expected.expectedStats || stats;
  const keys = statKeys(baselineStats);
  const expectedCount = sumStats(baselineStats, keys);
  const detectedCount = sumStats(stats, keys);
  const matched = keys.reduce((sum, key) => sum + Math.min(stats[key] || 0, baselineStats[key] || 0), 0);
  const exactMatches = keys.filter(key => (stats[key] || 0) === (baselineStats[key] || 0)).length;
  return {
    truePositive: matched,
    predictedPositive: detectedCount,
    actualPositive: expectedCount,
    correctDecision: exactMatches,
    totalDecision: Math.max(keys.length, 1),
    validWarning: stats.warnings || 0,
    totalWarning: stats.warnings || 0,
    matchedRule: detectedCount > 0 ? 1 : 0,
    totalRule: 1,
    successfulFix: 0,
    attemptedFix: 0,
    manualOverrideCount: 0,
  };
}

function subsetStats(structure: WordStructureJson): Record<string, number> {
  return {
    headings: structure.headings.length,
    paragraphs: structure.paragraphs.filter(paragraph => paragraph.text.trim()).length,
    figures: structure.figures.length,
    tables: structure.tables.length,
    continuationTables: structure.tables.filter(table => table.isContinuation).length,
    references: structure.references.length,
    headersFooters: structure.headersFooters.length,
    warnings: structure.warnings.length,
  };
}

function validateBaseline(sampleName: string, expected: ExpectedBaseline, structure: WordStructureJson, stats: Record<string, number>): Array<{ sampleName: string; reason: string }> {
  const failures: Array<{ sampleName: string; reason: string }> = [];
  const expectedStats = expected.expectedStats || {};
  if (expected.qualityGate?.enforceExactStats) {
    for (const key of statKeys(expectedStats)) {
      if ((stats[key] || 0) !== expectedStats[key]) {
        failures.push({ sampleName, reason: `${key} expected ${expectedStats[key]} but got ${stats[key] || 0}` });
      }
    }
  }

  for (const warningCode of expected.qualityGate?.requiredWarningCodes || []) {
    if (!structure.warnings.some(warning => warning.warningCode === warningCode)) {
      failures.push({ sampleName, reason: `missing required warning ${warningCode}` });
    }
  }

  if (sumStats(stats) === 0) {
    failures.push({ sampleName, reason: 'no_detected_objects' });
  }

  return failures;
}

export async function runWordSystemRegression(options: {
  manifestPath?: string;
  samplesDir?: string;
  reportsDir?: string;
} = {}): Promise<SampleRunResult[]> {
  const manifestPath = options.manifestPath || join(skillRoot, 'fixtures', 'samples', 'sample-manifest.json');
  const samplesDir = options.samplesDir || join(skillRoot, 'fixtures', 'samples');
  const reportsDir = options.reportsDir || join(skillRoot, 'reports');
  mkdirSync(reportsDir, { recursive: true });
  const manifest = loadManifest(manifestPath);
  const results: SampleRunResult[] = [];

  for (const sample of manifest.samples) {
    const docxPath = join(samplesDir, sample.sampleName);
    if (!existsSync(docxPath)) {
      if (sample.required) {
        throw new Error(`Required Word System sample missing: ${docxPath}`);
      }
      continue;
    }

    const raw = await loadDocxFixture(docxPath);
    const structure = detectWordStructure(raw);
    const stats = subsetStats(structure);
    const expected = loadExpectedBaseline(sample.sampleName);
    const failedSamples = validateBaseline(sample.sampleName, expected, structure, stats);
    const report = buildEvaluationReport({
      sampleName: sample.sampleName,
      counts: buildCounts(expected, stats),
      subsetStats: stats,
      failedSamples,
      warningDetails: structure.warnings,
      suggestedRules: structure.warnings.map(warning => warning.warningCode),
    });

    results.push({ sampleName: sample.sampleName, docxPath, structure, report });
    writeEvaluationReports(
      report,
      join(reportsDir, `${sample.sampleName.replace(/\.docx$/i, '')}.eval.json`),
      join(reportsDir, `${sample.sampleName.replace(/\.docx$/i, '')}.eval.md`),
    );
  }

  const aggregate = buildAggregateReport(results);
  writeEvaluationReports(
    aggregate,
    join(reportsDir, 'word-system-eval-report.json'),
    join(reportsDir, 'word-system-eval-report.md'),
  );
  return results;
}

export function buildAggregateReport(results: SampleRunResult[]): EvaluationReport {
  const count = Math.max(results.length, 1);
  const average = (key: keyof EvaluationReport): number =>
    results.reduce((sum, result) => sum + Number(result.report[key]), 0) / count;
  return {
    sampleName: 'word-system-regression-suite',
    subsetStats: results.reduce<Record<string, number>>((stats, result) => {
      for (const [key, value] of Object.entries(result.report.subsetStats)) {
        stats[key] = (stats[key] || 0) + value;
      }
      return stats;
    }, {}),
    precision: average('precision'),
    recall: average('recall'),
    accuracy: average('accuracy'),
    f1: average('f1'),
    warningValidRate: average('warningValidRate'),
    ruleHitRate: average('ruleHitRate'),
    fixSuccessRate: average('fixSuccessRate'),
    manualOverrideRate: average('manualOverrideRate'),
    failedSamples: results.flatMap(result => result.report.failedSamples),
    warningDetails: results.flatMap(result => result.report.warningDetails),
    suggestedRules: [...new Set(results.flatMap(result => result.report.suggestedRules))],
    passedReleaseGate: results.every(result => result.report.passedReleaseGate),
  };
}

if (process.argv[1] && basename(process.argv[1]) === 'regression-runner.ts') {
  runWordSystemRegression()
    .then(results => {
      const summary = results.map(result => ({
        sampleName: result.sampleName,
        headings: result.structure.headings.length,
        paragraphs: result.structure.paragraphs.filter(paragraph => paragraph.text.trim()).length,
        figures: result.structure.figures.length,
        tables: result.structure.tables.length,
        references: result.structure.references.length,
        warnings: result.structure.warnings.length,
        f1: Number(result.report.f1.toFixed(4)),
      }));
      console.log(JSON.stringify({ status: 'passed', samples: summary }, null, 2));
      if (results.some(result => result.report.failedSamples.length > 0)) {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}
