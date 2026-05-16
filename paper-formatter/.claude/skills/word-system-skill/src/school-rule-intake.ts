import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDocxFixture } from './docx-fixture-loader.ts';
import type { RawParagraph } from './heading-detector.ts';
import { detectWordStructure, type WordStructureJson } from './structure-detector.ts';

type CandidateStatus = 'candidate' | 'needs_review' | 'insufficient_evidence';

export interface SchoolRuleCandidate {
  ruleId: string;
  label: string;
  targetObject: string;
  value: unknown;
  unit?: string;
  confidence: number;
  status: CandidateStatus;
  evidence: Record<string, unknown>;
}

export interface CanonicalProfileDraft {
  schoolId: string;
  name: string;
  faculty: string;
  version: string;
  effectiveFrom: string;
  aliases: string[];
  sourceType: 'draft_from_docx';
  sourceDocx: string;
  rulesJson: Array<Record<string, unknown>>;
  styleMap: Array<Record<string, unknown>>;
  reviewNotes: string[];
}

export interface SchoolRuleIntakeReport {
  metadata: {
    schoolId: string;
    schoolName: string;
    sourceDocx: string;
    generatedAt: string;
    canonicalMatch?: { schoolId: string; name: string; aliases: string[] };
  };
  structureStats: Record<string, number>;
  candidates: SchoolRuleCandidate[];
  warnings: string[];
  draftProfile: CanonicalProfileDraft;
}

interface RegistryEntry {
  schoolId: string;
  name: string;
  aliases: string[];
}

const skillRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const registryPath = resolve(skillRoot, '../../../services/api-gateway/src/fixtures/canonical-school-registry.json');

function mode<T>(values: T[]): { value?: T; count: number } {
  const counts = new Map<T, number>();
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([value, count]) => ({ value, count }))[0] || { count: 0 };
}

function numberMode(values: Array<number | undefined>, precision = 2): { value?: number; count: number } {
  return mode(values.filter((value): value is number => Number.isFinite(value)).map(value => Number(value.toFixed(precision))));
}

function twipsToCm(twips: number): number {
  return Math.round((twips / 1440) * 2.54 * 100) / 100;
}

function loadRegistry(): RegistryEntry[] {
  try {
    return JSON.parse(readFileSync(registryPath, 'utf8')) as RegistryEntry[];
  } catch {
    return [];
  }
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, '').toLowerCase();
}

function resolveCanonicalSchool(input: { schoolId?: string; schoolName?: string; sourceDocx: string }): RegistryEntry | undefined {
  const registry = loadRegistry();
  if (input.schoolId) {
    const byId = registry.find(entry => entry.schoolId === input.schoolId);
    if (byId) return byId;
  }
  const haystack = normalizeText(`${input.schoolName || ''} ${input.sourceDocx}`);
  return registry.find(entry => [entry.name, ...entry.aliases].some(alias => haystack.includes(normalizeText(alias))));
}

function confidenceFrom(count: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round(Math.min(count / total, 1) * 100) / 100;
}

function candidate(input: Omit<SchoolRuleCandidate, 'status'>): SchoolRuleCandidate {
  return {
    ...input,
    status: input.confidence >= 0.75 ? 'candidate' : input.confidence >= 0.4 ? 'needs_review' : 'insufficient_evidence',
  };
}

function buildLayoutCandidates(metadata: Record<string, unknown>): SchoolRuleCandidate[] {
  const pageMargins = metadata.pageMarginsMm as Record<string, number> | undefined;
  if (!pageMargins) return [];
  return [
    ['margin_top_mm', '上边距', pageMargins.top],
    ['margin_bottom_mm', '下边距', pageMargins.bottom],
    ['margin_left_mm', '左边距', pageMargins.left],
    ['margin_right_mm', '右边距', pageMargins.right],
    ['gutter_mm', '装订线', pageMargins.gutter],
  ].map(([ruleId, label, value]) => candidate({
    ruleId: String(ruleId),
    label: String(label),
    targetObject: '页面',
    value,
    unit: 'mm',
    confidence: Number(value) > 0 || ruleId === 'gutter_mm' ? 0.95 : 0.3,
    evidence: { pageMarginsMm: pageMargins },
  }));
}

function bodyParagraphs(paragraphs: RawParagraph[]): RawParagraph[] {
  return paragraphs.filter(paragraph => {
    const text = paragraph.text.trim();
    if (!text || text.length < 8) return false;
    if (/^(第[一二三四五六七八九十\d]+章|摘要|abstract|目录|参考文献|致谢|附录)/i.test(text)) return false;
    return true;
  });
}

function buildBodyCandidates(paragraphs: RawParagraph[]): SchoolRuleCandidate[] {
  const body = bodyParagraphs(paragraphs);
  const font = mode(body.map(paragraph => paragraph.font).filter((value): value is string => Boolean(value)));
  const fontSize = numberMode(body.map(paragraph => paragraph.fontSize), 1);
  const lineSpacing = numberMode(body.map(paragraph => paragraph.lineSpacing), 2);
  const indent = numberMode(body.map(paragraph => paragraph.indent).filter((value): value is number => Number.isFinite(value)).map(twipsToCm), 2);
  const alignment = mode(body.map(paragraph => paragraph.alignment).filter((value): value is string => Boolean(value)));

  return [
    candidate({
      ruleId: 'body_fonts',
      label: '正文字体',
      targetObject: '正文',
      value: font.value ? [font.value, 'Times New Roman'] : [],
      confidence: confidenceFrom(font.count, body.length),
      evidence: { sampleCount: body.length, dominantFontCount: font.count },
    }),
    candidate({
      ruleId: 'body_font_size_pt',
      label: '正文字号',
      targetObject: '正文',
      value: fontSize.value,
      unit: 'pt',
      confidence: confidenceFrom(fontSize.count, body.length),
      evidence: { sampleCount: body.length, dominantSizeCount: fontSize.count },
    }),
    candidate({
      ruleId: 'line_spacing',
      label: '正文行距',
      targetObject: '正文',
      value: lineSpacing.value,
      confidence: confidenceFrom(lineSpacing.count, body.length),
      evidence: { sampleCount: body.length, dominantLineSpacingCount: lineSpacing.count },
    }),
    candidate({
      ruleId: 'first_line_indent_cm',
      label: '首行缩进',
      targetObject: '正文',
      value: indent.value,
      unit: 'cm',
      confidence: confidenceFrom(indent.count, body.length),
      evidence: { sampleCount: body.length, dominantIndentCount: indent.count },
    }),
    candidate({
      ruleId: 'body_alignment',
      label: '正文对齐',
      targetObject: '正文',
      value: alignment.value,
      confidence: confidenceFrom(alignment.count, body.length),
      evidence: { sampleCount: body.length, dominantAlignmentCount: alignment.count },
    }),
  ];
}

function buildHeadingCandidates(paragraphs: RawParagraph[], structure: WordStructureJson): SchoolRuleCandidate[] {
  const headingParagraphs = structure.headings.map(heading => paragraphs.find(paragraph => paragraph.paragraphIndex === heading.paragraphIndex)).filter(Boolean) as RawParagraph[];
  const before = numberMode(headingParagraphs.map(paragraph => paragraph.spaceBefore), 1);
  const after = numberMode(headingParagraphs.map(paragraph => paragraph.spaceAfter), 1);
  return [
    candidate({
      ruleId: 'heading_before_pt',
      label: '标题段前',
      targetObject: '标题',
      value: before.value,
      unit: 'pt',
      confidence: confidenceFrom(before.count, Math.max(headingParagraphs.length, 1)),
      evidence: { headingCount: headingParagraphs.length, dominantBeforeCount: before.count },
    }),
    candidate({
      ruleId: 'heading_after_pt',
      label: '标题段后',
      targetObject: '标题',
      value: after.value,
      unit: 'pt',
      confidence: confidenceFrom(after.count, Math.max(headingParagraphs.length, 1)),
      evidence: { headingCount: headingParagraphs.length, dominantAfterCount: after.count },
    }),
  ];
}

function buildObjectCandidates(structure: WordStructureJson): SchoolRuleCandidate[] {
  return [
    candidate({
      ruleId: 'figure_caption_binding',
      label: '图题绑定',
      targetObject: '图题',
      value: 'figure_caption_nearby_below',
      confidence: structure.figures.length > 0 ? confidenceFrom(structure.figures.filter(figure => figure.caption).length, structure.figures.length) : 0,
      evidence: { figureCount: structure.figures.length, boundCaptionCount: structure.figures.filter(figure => figure.caption).length },
    }),
    candidate({
      ruleId: 'table_caption_binding',
      label: '表题绑定',
      targetObject: '表题',
      value: 'table_caption_nearby_above',
      confidence: structure.tables.length > 0 ? confidenceFrom(structure.tables.filter(table => table.caption).length, structure.tables.length) : 0,
      evidence: { tableCount: structure.tables.length, captionCount: structure.tables.filter(table => table.caption).length },
    }),
    candidate({
      ruleId: 'reference_section_required',
      label: '参考文献章节',
      targetObject: '参考文献',
      value: structure.references.length > 0,
      confidence: structure.references.length > 0 ? 0.9 : 0.2,
      evidence: { referenceCount: structure.references.length },
    }),
    candidate({
      ruleId: 'header_footer_required',
      label: '页眉页脚',
      targetObject: '页眉页脚',
      value: structure.headersFooters.length > 0,
      confidence: structure.headersFooters.length > 0 ? 0.9 : 0.2,
      evidence: { headerFooterCount: structure.headersFooters.length },
    }),
  ];
}

function buildDraftProfile(input: {
  canonical?: RegistryEntry;
  schoolId: string;
  schoolName: string;
  sourceDocx: string;
  candidates: SchoolRuleCandidate[];
}): CanonicalProfileDraft {
  const rulesJson = input.candidates
    .filter(item => !['body_fonts', 'first_line_indent_cm'].includes(item.ruleId))
    .map(item => ({
      ruleId: item.ruleId,
      label: item.label,
      value: item.value,
      unit: item.unit,
      confidence: item.confidence,
      status: item.status,
      evidence: item.evidence,
    }));
  const styleMap = input.candidates
    .filter(item => ['body_fonts', 'first_line_indent_cm'].includes(item.ruleId))
    .map(item => ({
      ruleId: item.ruleId,
      label: item.label,
      value: item.value,
      unit: item.unit,
      confidence: item.confidence,
      status: item.status,
      evidence: item.evidence,
    }));

  return {
    schoolId: input.canonical?.schoolId || input.schoolId,
    name: input.canonical?.name || input.schoolName,
    faculty: '待确认学院/通用规范',
    version: `draft-${new Date().toISOString().slice(0, 10)}`,
    effectiveFrom: new Date().toISOString().slice(0, 10),
    aliases: input.canonical?.aliases || [input.schoolName],
    sourceType: 'draft_from_docx',
    sourceDocx: input.sourceDocx,
    rulesJson,
    styleMap,
    reviewNotes: [
      '这是由真实 docx 自动采集生成的草案，不应直接上线。',
      'confidence < 0.75 的候选项需要人工确认。',
      '正式合入前应补充对应学校的 regression fixture。',
    ],
  };
}

function structureStats(structure: WordStructureJson): Record<string, number> {
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

export async function runSchoolRuleIntake(options: {
  docxPath: string;
  schoolId?: string;
  schoolName?: string;
  outDir?: string;
}): Promise<SchoolRuleIntakeReport> {
  const raw = await loadDocxFixture(options.docxPath);
  const structure = detectWordStructure(raw);
  const canonical = resolveCanonicalSchool({
    schoolId: options.schoolId,
    schoolName: options.schoolName,
    sourceDocx: options.docxPath,
  });
  const schoolId = canonical?.schoolId || options.schoolId || 'school_draft';
  const schoolName = canonical?.name || options.schoolName || '待确认学校';
  const candidates = [
    ...buildLayoutCandidates(raw.metadata || {}),
    ...buildBodyCandidates(raw.paragraphs),
    ...buildHeadingCandidates(raw.paragraphs, structure),
    ...buildObjectCandidates(structure),
  ];
  const warnings = candidates
    .filter(item => item.status !== 'candidate')
    .map(item => `${item.ruleId} confidence=${item.confidence} requires review`);
  const draftProfile = buildDraftProfile({
    canonical,
    schoolId,
    schoolName,
    sourceDocx: options.docxPath,
    candidates,
  });

  const report: SchoolRuleIntakeReport = {
    metadata: {
      schoolId,
      schoolName,
      sourceDocx: options.docxPath,
      generatedAt: new Date().toISOString(),
      canonicalMatch: canonical,
    },
    structureStats: structureStats(structure),
    candidates,
    warnings,
    draftProfile,
  };

  if (options.outDir) {
    writeSchoolRuleIntakeReport(report, options.outDir);
  }
  return report;
}

export function renderSchoolRuleIntakeMarkdown(report: SchoolRuleIntakeReport): string {
  const rows = report.candidates.map(item =>
    `| ${item.ruleId} | ${item.label} | ${item.targetObject} | ${JSON.stringify(item.value)} | ${item.unit || ''} | ${item.confidence.toFixed(2)} | ${item.status} |`,
  );
  return [
    '# School Rule Intake Report',
    '',
    `- 学校: ${report.metadata.schoolName} (${report.metadata.schoolId})`,
    `- 来源: ${report.metadata.sourceDocx}`,
    `- 生成时间: ${report.metadata.generatedAt}`,
    `- canonical 匹配: ${report.metadata.canonicalMatch ? '是' : '否'}`,
    '',
    '## Structure Stats',
    '',
    ...Object.entries(report.structureStats).map(([key, value]) => `- ${key}: ${value}`),
    '',
    '## Candidate Rules',
    '',
    '| ruleId | label | target | value | unit | confidence | status |',
    '|---|---|---|---|---|---:|---|',
    ...rows,
    '',
    '## Warnings',
    '',
    ...(report.warnings.length ? report.warnings.map(warning => `- ${warning}`) : ['- 无']),
    '',
    '## Draft Profile',
    '',
    '```json',
    JSON.stringify(report.draftProfile, null, 2),
    '```',
    '',
  ].join('\n');
}

export function writeSchoolRuleIntakeReport(report: SchoolRuleIntakeReport, outDir: string): void {
  mkdirSync(outDir, { recursive: true });
  const baseName = `${report.metadata.schoolId}-rule-intake`;
  writeFileSync(join(outDir, `${baseName}.json`), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(join(outDir, `${baseName}.md`), renderSchoolRuleIntakeMarkdown(report));
  writeFileSync(join(outDir, `${baseName}.profile-draft.json`), `${JSON.stringify(report.draftProfile, null, 2)}\n`);
}

function readArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

if (process.argv[1]?.endsWith('school-rule-intake.ts')) {
  const docxPath = readArg('--docx');
  if (!docxPath) {
    console.error('Usage: tsx school-rule-intake.ts --docx <path> [--school-id id] [--school-name name] [--out-dir dir]');
    process.exit(1);
  }
  runSchoolRuleIntake({
    docxPath,
    schoolId: readArg('--school-id'),
    schoolName: readArg('--school-name'),
    outDir: readArg('--out-dir') || join(skillRoot, 'reports', 'school-rule-intake'),
  }).then(report => {
    console.log(JSON.stringify({
      status: 'passed',
      schoolId: report.metadata.schoolId,
      schoolName: report.metadata.schoolName,
      candidateCount: report.candidates.length,
      reviewCount: report.warnings.length,
      draftRules: report.draftProfile.rulesJson.length,
      draftStyles: report.draftProfile.styleMap.length,
    }, null, 2));
  }).catch(error => {
    console.error(error);
    process.exit(1);
  });
}

