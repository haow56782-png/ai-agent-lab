import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { runWordSystemRegression } from '../src/regression-runner.ts';

const skillRoot = resolve(import.meta.dirname, '..');
const reportsDir = join(skillRoot, 'reports', 'test-run');
const manifest = JSON.parse(readFileSync(join(skillRoot, 'fixtures', 'samples', 'sample-manifest.json'), 'utf8')) as {
  samples: Array<{ sampleName: string }>;
};
const results = await runWordSystemRegression({ reportsDir });

assert.equal(results.length, manifest.samples.length);
assert.ok(results.every(result => existsSync(result.docxPath)));
assert.ok(results.every(result => result.structure.paragraphs.length > 0));
assert.ok(results.some(result => result.structure.figures.length > 0));
assert.ok(results.some(result => result.structure.tables.length > 0));
assert.ok(existsSync(join(reportsDir, 'word-system-eval-report.json')));
assert.ok(existsSync(join(reportsDir, 'word-system-eval-report.md')));

console.log('e2e-regression.test.ts passed');
