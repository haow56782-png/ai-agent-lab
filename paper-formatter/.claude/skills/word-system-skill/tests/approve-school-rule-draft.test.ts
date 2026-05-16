import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { approveSchoolRuleDraft } from '../src/approve-school-rule-draft.ts';
import { runSchoolRuleIntake } from '../src/school-rule-intake.ts';

const skillRoot = resolve(import.meta.dirname, '..');
const docxPath = join(skillRoot, 'fixtures', 'samples', 'p0-basic-thesis.docx');
const tmp = mkdtempSync(join(tmpdir(), 'word-system-approve-draft-'));
const intakeDir = join(tmp, 'intake');
const samplesDir = join(tmp, 'samples');
const expectedDir = join(tmp, 'expected');
const manifestPath = join(samplesDir, 'sample-manifest.json');
const profilePath = join(tmp, 'canonical-school-profiles.ts');
const registryPath = join(tmp, 'canonical-school-registry.json');
mkdirSync(samplesDir, { recursive: true });
writeFileSync(manifestPath, JSON.stringify({ metadata: { purpose: 'test' }, samples: [] }, null, 2));
writeFileSync(registryPath, JSON.stringify([], null, 2));
writeFileSync(profilePath, [
  'export const CANONICAL_PROFILE_SEEDS = [',
  '];',
  '',
  'const registryBySchoolId = new Map();',
  '',
].join('\n'));

const intakeReport = await runSchoolRuleIntake({
  docxPath,
  schoolId: 'demo_rule_university',
  schoolName: '示范规则大学',
  outDir: intakeDir,
});

const draftPath = join(intakeDir, `${intakeReport.metadata.schoolId}-rule-intake.profile-draft.json`);
await assert.rejects(
  () => approveSchoolRuleDraft({ draftPath, approve: false, profilePath, registryPath, sampleName: 'demo-rule-university-test', samplesDir, expectedDir, manifestPath }),
  /explicit approve=true/,
);

const result = await approveSchoolRuleDraft({
  draftPath,
  approve: true,
  profilePath,
  registryPath,
  sampleName: 'demo-rule-university-test',
  samplesDir,
  expectedDir,
  manifestPath,
});

assert.equal(result.status, 'approved');
assert.equal(result.insertedProfile, true);
assert.equal(result.insertedRegistry, true);
assert.match(readFileSync(profilePath, 'utf8'), /schoolId: "demo_rule_university"/);
const registry = JSON.parse(readFileSync(registryPath, 'utf8')) as Array<{ schoolId: string; aliases: string[] }>;
assert.deepEqual(registry.find(entry => entry.schoolId === 'demo_rule_university')?.aliases, ['示范规则大学']);
assert.match(readFileSync(result.expectedPath, 'utf8'), /approved-school-rule-draft-v0.1/);

console.log('approve-school-rule-draft.test.ts passed');
