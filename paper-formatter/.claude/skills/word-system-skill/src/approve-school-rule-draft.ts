import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDocxFixture } from './docx-fixture-loader.ts';
import { detectWordStructure } from './structure-detector.ts';

interface DraftRule {
  ruleId: string;
  label?: string;
  value: unknown;
  unit?: string;
  confidence?: number;
  status?: string;
}

interface CanonicalProfileDraft {
  schoolId: string;
  name: string;
  faculty: string;
  version: string;
  effectiveFrom: string;
  aliases: string[];
  sourceType: 'draft_from_docx';
  sourceDocx: string;
  rulesJson: DraftRule[];
  styleMap: DraftRule[];
  reviewNotes?: string[];
}

interface ApprovalResult {
  status: 'approved';
  schoolId: string;
  profilePath: string;
  registryPath: string;
  samplePath: string;
  expectedPath: string;
  manifestPath: string;
  insertedProfile: boolean;
  insertedRegistry: boolean;
}

const skillRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(skillRoot, '../../..');
const canonicalProfilesPath = join(repoRoot, 'services', 'api-gateway', 'src', 'fixtures', 'canonical-school-profiles.ts');
const canonicalRegistryPath = join(repoRoot, 'services', 'api-gateway', 'src', 'fixtures', 'canonical-school-registry.json');
const samplesDir = join(skillRoot, 'fixtures', 'samples');
const expectedDir = join(skillRoot, 'fixtures', 'expected');
const manifestPath = join(samplesDir, 'sample-manifest.json');

function readArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function assertSafeDraft(draft: CanonicalProfileDraft): void {
  if (draft.sourceType !== 'draft_from_docx') {
    throw new Error('Only draft_from_docx profiles can be approved by this script.');
  }
  if (!draft.schoolId || !/^[a-z0-9_-]+$/.test(draft.schoolId)) {
    throw new Error(`Invalid schoolId: ${draft.schoolId}`);
  }
  if (!draft.name || draft.rulesJson.length === 0) {
    throw new Error('Draft must include school name and rulesJson.');
  }
}

function ruleValue(draft: CanonicalProfileDraft, ruleId: string, fallback: number): number {
  const value = Number(draft.rulesJson.find(rule => rule.ruleId === ruleId)?.value);
  return Number.isFinite(value) ? value : fallback;
}

function styleValue<T>(draft: CanonicalProfileDraft, ruleId: string, fallback: T): T {
  const value = draft.styleMap.find(rule => rule.ruleId === ruleId)?.value;
  return (value === undefined ? fallback : value) as T;
}

function renderSeedBlock(draft: CanonicalProfileDraft): string {
  const bodyFonts = styleValue<string[]>(draft, 'body_fonts', ['宋体', 'Times New Roman']);
  const firstLineIndentCm = Number(styleValue<number>(draft, 'first_line_indent_cm', 0.74));
  return `  {
    schoolId: ${JSON.stringify(draft.schoolId)},
    name: ${JSON.stringify(draft.name)},
    faculty: ${JSON.stringify(draft.faculty || '通用规范')},
    version: ${JSON.stringify(draft.version)},
    effectiveFrom: ${JSON.stringify(draft.effectiveFrom)},
    aliases: [],
    ...createRulePayload({
      marginTop: ${ruleValue(draft, 'margin_top_mm', 25)}, marginBottom: ${ruleValue(draft, 'margin_bottom_mm', 25)}, marginLeft: ${ruleValue(draft, 'margin_left_mm', 30)}, marginRight: ${ruleValue(draft, 'margin_right_mm', 25)}, gutter: ${ruleValue(draft, 'gutter_mm', 0)},
      headingBefore: ${ruleValue(draft, 'heading_before_pt', 24)}, headingAfter: ${ruleValue(draft, 'heading_after_pt', 18)}, lineSpacing: ${ruleValue(draft, 'line_spacing', 1.5)},
      bodyFonts: ${JSON.stringify(bodyFonts)}, firstLineIndentCm: ${Number.isFinite(firstLineIndentCm) ? firstLineIndentCm : 0.74},
    }),
  },
`;
}

function upsertCanonicalProfile(draft: CanonicalProfileDraft, profilePath: string): boolean {
  const source = readFileSync(profilePath, 'utf8');
  if (source.includes(`schoolId: ${JSON.stringify(draft.schoolId)}`)) {
    return false;
  }
  const marker = '];\n\nconst registryBySchoolId';
  if (!source.includes(marker)) {
    throw new Error('Unable to find CANONICAL_PROFILE_SEEDS insertion marker.');
  }
  const updated = source.replace(marker, `${renderSeedBlock(draft)}];\n\nconst registryBySchoolId`);
  writeFileSync(profilePath, updated);
  return true;
}

function upsertCanonicalRegistry(draft: CanonicalProfileDraft, registryPath: string): boolean {
  const entries = JSON.parse(readFileSync(registryPath, 'utf8')) as Array<{
    schoolId: string;
    name: string;
    aliases: string[];
  }>;
  const existing = entries.find(entry => entry.schoolId === draft.schoolId);
  if (existing) {
    const aliases = new Set([...(existing.aliases || []), draft.name, ...draft.aliases]);
    existing.name = existing.name || draft.name;
    existing.aliases = [...aliases];
    writeFileSync(registryPath, `${JSON.stringify(entries, null, 2)}\n`);
    return false;
  }
  entries.push({
    schoolId: draft.schoolId,
    name: draft.name,
    aliases: [...new Set([draft.name, ...draft.aliases])],
  });
  writeFileSync(registryPath, `${JSON.stringify(entries, null, 2)}\n`);
  return true;
}

async function buildExpectedBaseline(sampleName: string, docxPath: string, schoolId: string, schoolName: string): Promise<Record<string, unknown>> {
  const raw = await loadDocxFixture(docxPath);
  const structure = detectWordStructure(raw);
  const stats = {
    headings: structure.headings.length,
    paragraphs: structure.paragraphs.filter(paragraph => paragraph.text.trim()).length,
    figures: structure.figures.length,
    tables: structure.tables.length,
    continuationTables: structure.tables.filter(table => table.isContinuation).length,
    references: structure.references.length,
    headersFooters: structure.headersFooters.length,
    warnings: structure.warnings.length,
  };
  return {
    metadata: {
      sampleName,
      school: schoolName,
      schoolId,
      ruleVersion: 'approved-draft',
      baselineStandard: 'GB/T 7713.1-2025',
      baselineStatus: 'approved-school-rule-draft-v0.1',
      sourceDocx: `${sampleName}.docx`,
    },
    expectedStats: stats,
    qualityGate: {
      enforceExactStats: true,
      requiredWarningCodes: [...new Set(structure.warnings.map(warning => warning.warningCode))],
    },
    expectedHeadings: structure.headings.slice(0, 5).map(heading => ({ text: heading.text, level: heading.level })),
    expectedParagraphs: [{ minimumCount: stats.paragraphs }],
    expectedFigures: [{ minimumCount: stats.figures }],
    expectedTables: [{ minimumCount: stats.tables }],
    expectedContinuationTables: stats.continuationTables > 0 ? [{ minimumCount: stats.continuationTables }] : [],
    expectedReferences: [{ minimumCount: stats.references }],
    expectedHeadersFooters: [{ minimumCount: stats.headersFooters }],
    expectedWarnings: [...new Set(structure.warnings.map(warning => warning.warningCode))].map(warningCode => ({ warningCode })),
  };
}

function upsertManifestSample(manifestFile: string, sampleName: string, schoolId: string): void {
  const manifest = JSON.parse(readFileSync(manifestFile, 'utf8')) as {
    samples: Array<{ sampleName: string; subset: string; required: boolean; covers: string[] }>;
  };
  const docxName = `${sampleName}.docx`;
  if (!manifest.samples.some(sample => sample.sampleName === docxName)) {
    manifest.samples.push({
      sampleName: docxName,
      subset: 'P0',
      required: true,
      covers: ['schoolRuleIntake', schoolId, 'approvedDraft'],
    });
  }
  writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
}

export async function approveSchoolRuleDraft(options: {
  draftPath: string;
  approve: boolean;
  profilePath?: string;
  registryPath?: string;
  sampleName?: string;
  samplesDir?: string;
  expectedDir?: string;
  manifestPath?: string;
}): Promise<ApprovalResult> {
  if (!options.approve) {
    throw new Error('Refusing to approve draft without explicit approve=true.');
  }
  const draft = JSON.parse(readFileSync(options.draftPath, 'utf8')) as CanonicalProfileDraft;
  assertSafeDraft(draft);
  if (!existsSync(draft.sourceDocx)) {
    throw new Error(`Draft sourceDocx does not exist: ${draft.sourceDocx}`);
  }

  const sampleName = options.sampleName || `${draft.schoolId}-approved-${new Date().toISOString().slice(0, 10)}`;
  const targetSamplesDir = options.samplesDir || samplesDir;
  const targetExpectedDir = options.expectedDir || expectedDir;
  const targetManifestPath = options.manifestPath || manifestPath;
  const targetProfilePath = options.profilePath || canonicalProfilesPath;
  const targetRegistryPath = options.registryPath || canonicalRegistryPath;
  mkdirSync(targetSamplesDir, { recursive: true });
  mkdirSync(targetExpectedDir, { recursive: true });
  const samplePath = join(targetSamplesDir, `${sampleName}.docx`);
  const expectedPath = join(targetExpectedDir, `${sampleName}.expected.json`);
  copyFileSync(draft.sourceDocx, samplePath);
  const expected = await buildExpectedBaseline(sampleName, samplePath, draft.schoolId, draft.name);
  writeFileSync(expectedPath, `${JSON.stringify(expected, null, 2)}\n`);
  upsertManifestSample(targetManifestPath, sampleName, draft.schoolId);
  const insertedRegistry = upsertCanonicalRegistry(draft, targetRegistryPath);
  const insertedProfile = upsertCanonicalProfile(draft, targetProfilePath);

  return {
    status: 'approved',
    schoolId: draft.schoolId,
    profilePath: targetProfilePath,
    registryPath: targetRegistryPath,
    samplePath,
    expectedPath,
    manifestPath: targetManifestPath,
    insertedProfile,
    insertedRegistry,
  };
}

if (process.argv[1]?.endsWith('approve-school-rule-draft.ts')) {
  const draftPath = readArg('--draft');
  if (!draftPath) {
    console.error('Usage: tsx approve-school-rule-draft.ts --draft <profile-draft.json> --approve [--sample-name name]');
    process.exit(1);
  }
  approveSchoolRuleDraft({
    draftPath,
    approve: hasFlag('--approve'),
    sampleName: readArg('--sample-name'),
  }).then(result => {
    console.log(JSON.stringify({
      status: result.status,
      schoolId: result.schoolId,
      insertedProfile: result.insertedProfile,
      insertedRegistry: result.insertedRegistry,
      samplePath: result.samplePath,
      expectedPath: result.expectedPath,
    }, null, 2));
  }).catch(error => {
    console.error(error);
    process.exit(1);
  });
}
