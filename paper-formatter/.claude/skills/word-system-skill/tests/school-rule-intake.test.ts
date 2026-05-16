import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { runSchoolRuleIntake } from '../src/school-rule-intake.ts';

const skillRoot = resolve(import.meta.dirname, '..');
const docxPath = join(skillRoot, 'fixtures', 'samples', 'p0-basic-thesis.docx');
const outDir = mkdtempSync(join(tmpdir(), 'word-system-school-intake-'));
const report = await runSchoolRuleIntake({
  docxPath,
  schoolId: 'ustc',
  schoolName: '中国科学技术大学',
  outDir,
});

assert.equal(report.metadata.schoolId, 'ustc');
assert.equal(report.metadata.schoolName, '中国科学技术大学');
assert.ok(report.candidates.length >= 12);
assert.ok(report.candidates.some(candidate => candidate.ruleId === 'margin_top_mm'));
assert.ok(report.candidates.some(candidate => candidate.ruleId === 'body_fonts'));
assert.ok(report.candidates.some(candidate => candidate.ruleId === 'line_spacing'));
assert.ok(report.draftProfile.rulesJson.some(rule => rule.ruleId === 'margin_top_mm'));
assert.ok(report.draftProfile.styleMap.some(rule => rule.ruleId === 'body_fonts'));
assert.ok(report.draftProfile.reviewNotes.length > 0);
assert.ok(existsSync(join(outDir, 'ustc-rule-intake.json')));
assert.ok(existsSync(join(outDir, 'ustc-rule-intake.md')));
assert.ok(existsSync(join(outDir, 'ustc-rule-intake.profile-draft.json')));

const draft = JSON.parse(readFileSync(join(outDir, 'ustc-rule-intake.profile-draft.json'), 'utf8'));
assert.equal(draft.sourceType, 'draft_from_docx');
assert.equal(draft.schoolId, 'ustc');

console.log('school-rule-intake.test.ts passed');

