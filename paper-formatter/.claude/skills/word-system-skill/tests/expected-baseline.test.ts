import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const skillRoot = resolve(import.meta.dirname, '..');
const samplesDir = join(skillRoot, 'fixtures', 'samples');
const expectedDir = join(skillRoot, 'fixtures', 'expected');
const manifest = JSON.parse(readFileSync(join(samplesDir, 'sample-manifest.json'), 'utf8')) as {
  samples: Array<{ sampleName: string }>;
};
const allowedBaselineStatuses = new Set(['human-curated-v0.1', 'approved-school-rule-draft-v0.1']);

for (const sample of manifest.samples) {
  const expectedPath = join(expectedDir, sample.sampleName.replace(/\.docx$/i, '.expected.json'));
  assert.ok(existsSync(expectedPath), `missing expected baseline for ${sample.sampleName}`);
  assert.ok(existsSync(join(samplesDir, sample.sampleName)), `missing real docx sample ${sample.sampleName}`);

  const expected = JSON.parse(readFileSync(expectedPath, 'utf8')) as {
    metadata?: Record<string, string>;
    expectedStats?: Record<string, number>;
    qualityGate?: { enforceExactStats?: boolean; requiredWarningCodes?: string[] };
  };

  assert.ok(
    allowedBaselineStatuses.has(expected.metadata?.baselineStatus || ''),
    `unsupported baselineStatus for ${sample.sampleName}: ${expected.metadata?.baselineStatus}`,
  );
  assert.equal(expected.metadata?.sourceDocx, sample.sampleName);
  assert.equal(expected.qualityGate?.enforceExactStats, true);
  assert.ok(Object.keys(expected.expectedStats || {}).length >= 8, `expectedStats incomplete for ${sample.sampleName}`);
  assert.ok((expected.qualityGate?.requiredWarningCodes || []).length > 0, `requiredWarningCodes empty for ${sample.sampleName}`);
}

const expectedFiles = readdirSync(expectedDir).filter(file => file.endsWith('.expected.json'));
assert.equal(expectedFiles.length, manifest.samples.length);

console.log('expected-baseline.test.ts passed');
