// Subset resolution unit tests — verify resolveSubsetFromActionText maps
// finding labels and rule names to correct thesisSubset, and tagRuleSubset
// correctly tags VisibleRuleCards.
import assert from 'node:assert/strict';

// ── Types (subset of VisibleRuleCard) ──────────────────────────────────────

interface VisibleRuleCard {
  id: string;
  source: '学校规则' | '国标';
  code: string;
  name: string;
  summary: string;
  hitCount: number;
  thesisSubset?: string;
}

// ── Helpers under test (duplicated from useFixRuntimePlayback.ts) ───────────

const SUBSET_MATCHERS: Record<string, RegExp> = {
  floating_object: /图片|印章|水印|浮动|图层|覆盖正文|shape/i,
  table: /表格|三线表|keep-together/i,
  table_caption: /图表|题注/i,
  reference: /参考文献|著录|DOI|7714/i,
  citation: /交叉引用|引用/i,
  footnote: /脚注/i,
  page_number: /页码|分节|页脚/i,
  header_footer: /页眉|页脚/i,
  heading: /标题|章节|层级|题名/i,
  page_canvas: /页边距|版芯|页面|纸张|装订线/i,
  cover: /封面|声明|题名页/i,
  abstract_zh: /摘要|关键词/i,
  toc: /目录|TOC/i,
  figure: /图片|图题/i,
  paragraph: /正文|段落|字体|行距|缩进|首行|样式/i,
};

function resolveSubsetFromActionText(text: string): string | null {
  for (const [subset, regex] of Object.entries(SUBSET_MATCHERS)) {
    if (regex.test(text)) return subset;
  }
  return null;
}

function tagRuleSubset(card: VisibleRuleCard): VisibleRuleCard {
  if (card.thesisSubset) return card;
  const text = `${card.name} ${card.summary}`;
  const subset = resolveSubsetFromActionText(text);
  return subset ? { ...card, thesisSubset: subset } : card;
}

// ── resolveSubsetFromActionText: finding labels ────────────────────────────

const FINDING_LABEL_CASES: Array<[string, string]> = [
  ['P0 发现 · 章节标题', 'heading'],
  ['P0 发现 · 正文行距异常', 'paragraph'],
  ['P1 发现 · 页边距设置', 'page_canvas'],
  ['P2 发现 · 封面声明页', 'cover'],
  ['P0 发现 · 摘要字数', 'abstract_zh'],
  ['P0 发现 · TOC目录生成', 'toc'],
  ['P1 发现 · 页码起始', 'page_number'],
  ['P0 发现 · 页眉内容', 'header_footer'],
  ['P2 发现 · 图题', 'figure'],
  ['P1 发现 · 表格样式', 'table'], // "表格" matches table before "样式" matches paragraph
  ['P0 发现 · 参考文献DOI', 'reference'],
  ['P2 发现 · 交叉引用', 'citation'],
  ['P0 发现 · 浮动对象覆盖正文', 'floating_object'],
  ['P1 发现 · 图表题注', 'table_caption'],
  ['P2 发现 · 脚注格式', 'footnote'],
];

for (const [label, expected] of FINDING_LABEL_CASES) {
  const result = resolveSubsetFromActionText(label);
  assert.equal(
    result, expected,
    `finding label "${label}" → "${expected}" (got "${result}")`,
  );
}

// ── resolveSubsetFromActionText: rule names ────────────────────────────────

const RULE_NAME_CASES: Array<[string, string | null]> = [
  ['USTC-vAuto · RULE-L2-HEADING · 标题层级', 'heading'],
  ['GB/T 7713.1-2025 · RULE-L2-REFERENCE · 参考文献', 'reference'],
  ['USTC-vAuto · RULE-L2-MARGIN · 页边距', 'page_canvas'],
  ['USTC-vAuto · RULE-L2-UNKNOWN · 未知', null],  // no keywords matched
  ['有题注', 'table_caption'],  // "题注" keyword
  ['有引用的', 'citation'],      // "引用" keyword
];

for (const [label, expected] of RULE_NAME_CASES) {
  const result = resolveSubsetFromActionText(label);
  assert.equal(
    result, expected,
    `rule name "${label}" → "${expected}" (got "${result}")`,
  );
}

// ── resolveSubsetFromActionText: no match → null ──────────────────────────

assert.equal(
  resolveSubsetFromActionText('一些不相关的描述文字'),
  null,
  'unrelated text → null',
);

assert.equal(
  resolveSubsetFromActionText(''),
  null,
  'empty text → null',
);

// ── tagRuleSubset: tags cards by name+summary ──────────────────────────────

{
  const card: VisibleRuleCard = {
    id: '学校规则:USTC-B1',
    source: '学校规则',
    code: 'USTC-B1',
    name: '章节标题',
    summary: '一级标题用黑体三号，段前段后保持统一。',
    hitCount: 0,
  };
  const tagged = tagRuleSubset(card);
  assert.equal(tagged.thesisSubset, 'heading', '章节标题 card → heading');
}

{
  const card: VisibleRuleCard = {
    id: '学校规则:USTC-B2',
    source: '学校规则',
    code: 'USTC-B2',
    name: '正文版芯',
    summary: '正文按学校版芯设置页边距与固定行距。',
    hitCount: 0,
  };
  const tagged = tagRuleSubset(card);
  // "正文" + "版芯" → could be paragraph or page_canvas
  assert.ok(
    tagged.thesisSubset === 'paragraph' || tagged.thesisSubset === 'page_canvas',
    `正文版芯 card → paragraph or page_canvas (got "${tagged.thesisSubset}")`,
  );
}

{
  const card: VisibleRuleCard = {
    id: '学校规则:USTC-C1',
    source: '学校规则',
    code: 'USTC-C1',
    name: '目录与页码',
    summary: '目录点线与页码右对齐，前置页与正文分节。',
    hitCount: 0,
  };
  const tagged = tagRuleSubset(card);
  // "目录" is checked first → toc, "页码" is after
  // Object.entries iterates in insertion order, heading comes first but doesn't match
  // paragraph doesn't match, page_canvas doesn't match, cover doesn't match
  // abstract_zh doesn't match, toc matches "目录"
  assert.equal(tagged.thesisSubset, 'page_number', '目录与页码 card → page_number (页码 matches before 目录)');
}

// ── tagRuleSubset: preserves existing thesisSubset ────────────────────────

{
  const card: VisibleRuleCard = {
    id: 'test',
    source: '学校规则',
    code: 'T1',
    name: 'anything',
    summary: 'nope',
    hitCount: 0,
    thesisSubset: 'heading', // pre-assigned
  };
  const tagged = tagRuleSubset(card);
  assert.equal(tagged.thesisSubset, 'heading', 'preserves pre-assigned subset');
}

// ── tagRuleSubset: no match → carries through unchanged (no thesisSubset) ─

{
  const card: VisibleRuleCard = {
    id: '学校规则:XYZ',
    source: '学校规则',
    code: 'XYZ',
    name: '一些不相关的规则名称',
    summary: '不匹配任何关键字。',
    hitCount: 0,
  };
  const tagged = tagRuleSubset(card);
  assert.equal(tagged.thesisSubset, undefined, 'no match → no thesisSubset set');
}

// ── Priority check: multiple matchers could match — first in Object.entries wins ─

// heading comes first in SUBSET_MATCHERS, so if text matches both heading and toc
assert.equal(
  resolveSubsetFromActionText('章节标题和目录'),
  'heading',
  'Object.entries iteration order means heading wins over toc',
);

console.log('subset-resolution unit tests passed');
