// Artifact rule label unit tests — verify getArtifactRuleLabel maps every
// FixType to a user-facing label instead of engineering language.
import assert from 'node:assert/strict';

// ── Types (subset of FixJobArtifact) ────────────────────────────────────────

type FixType =
  | 'margin' | 'body_style' | 'heading' | 'page_number'
  | 'cover' | 'toc' | 'duplication_preprocess'
  | 'header_footer' | 'abstract_format' | 'cross_ref'
  | 'caption' | 'reference_format' | 'table_format'
  | 'image_format' | 'punctuation';

interface FixJobArtifact {
  id: string;
  fixType: FixType;
  title: string;
  summary: string;
  details: string[];
  status: 'ready' | 'needs_review';
  chapter?: string;
  sourceSnippet?: string;
  finding_id?: string;
  related_finding_ids?: string[];
}

// ── Helpers under test (duplicated from useFixRuntimeActionPlayback.ts) ─────

const FIX_TYPE_LABEL: Record<string, string> = {
  margin: '页面边距',
  body_style: '正文样式',
  heading: '标题层级',
  page_number: '页码与分节',
  cover: '封面与声明',
  toc: '目录',
  duplication_preprocess: '查重预处理',
  header_footer: '页眉页脚',
  abstract_format: '摘要与关键词',
  cross_ref: '交叉引用',
  caption: '图表题注',
  reference_format: '参考文献',
  table_format: '表格样式',
  image_format: '图片样式',
  punctuation: '标点符号',
};

function getArtifactRuleLabel(artifact: FixJobArtifact): string {
  const typeLabel = FIX_TYPE_LABEL[artifact.fixType] || '版式修复';
  return `${typeLabel} · 学校规范`;
}

// ── All known FixType mappings ─────────────────────────────────────────────

const ALL_FIX_TYPES: FixType[] = [
  'margin', 'body_style', 'heading', 'page_number',
  'cover', 'toc', 'duplication_preprocess',
  'header_footer', 'abstract_format', 'cross_ref',
  'caption', 'reference_format', 'table_format',
  'image_format', 'punctuation',
];

const EXPECTED_LABELS: Record<FixType, string> = {
  margin: '页面边距 · 学校规范',
  body_style: '正文样式 · 学校规范',
  heading: '标题层级 · 学校规范',
  page_number: '页码与分节 · 学校规范',
  cover: '封面与声明 · 学校规范',
  toc: '目录 · 学校规范',
  duplication_preprocess: '查重预处理 · 学校规范',
  header_footer: '页眉页脚 · 学校规范',
  abstract_format: '摘要与关键词 · 学校规范',
  cross_ref: '交叉引用 · 学校规范',
  caption: '图表题注 · 学校规范',
  reference_format: '参考文献 · 学校规范',
  table_format: '表格样式 · 学校规范',
  image_format: '图片样式 · 学校规范',
  punctuation: '标点符号 · 学校规范',
};

for (const fixType of ALL_FIX_TYPES) {
  const artifact: FixJobArtifact = {
    id: `art_${fixType}`,
    fixType,
    title: EXPECTED_LABELS[fixType],
    summary: '',
    details: [],
    status: 'ready',
  };
  assert.equal(
    getArtifactRuleLabel(artifact),
    EXPECTED_LABELS[fixType],
    `[${fixType}] → "${EXPECTED_LABELS[fixType]}"`,
  );
}

// ── Unknown fixType → fallback ─────────────────────────────────────────────

{
  const unknown = {
    id: 'art_unknown',
    fixType: 'unknown_type' as FixType, // intentionally invalid
    title: '未知修复类型',
    summary: '',
    details: [],
    status: 'ready' as const,
  };
  const result = getArtifactRuleLabel(unknown);
  assert.ok(
    result.includes('版式修复'),
    `unknown fixType falls back to "版式修复", got "${result}"`,
  );
  assert.ok(result.includes('学校规范'), `result includes school suffix`);
}

// ── with chapter — note: chapter is NOT included in ruleLabel ──────────────

{
  const artifact: FixJobArtifact = {
    id: 'art_heading',
    fixType: 'heading',
    title: '标题层级已规范化',
    summary: '标题层级已规范化，已写回到修复稿件。',
    details: [],
    status: 'ready',
    chapter: '第一章 引言',
  };
  const result = getArtifactRuleLabel(artifact);
  assert.equal(result, '标题层级 · 学校规范');
  // Rule label uses fixType, not chapter — chapter is shown separately in the card.
  assert.ok(!result.includes('第一章'), 'chapter should not appear in ruleLabel');
}

console.log('artifact-rule-labels unit tests passed');
