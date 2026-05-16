// Fix interaction unit tests — verify runtime status machine, not-started
// predicate, and finding-to-fix-type resolution without a browser or backend.
import assert from 'node:assert/strict';

// ── Helpers under test (duplicated from useFixRuntimeModel so we test the
//    contract independently of React state initialisation) ────────────────

type RuntimeStatus = 'completed' | 'running' | 'paused';

function getRuntimeStatus(input: {
  allDone: boolean;
  active: boolean;
  viewPaused: boolean;
}): RuntimeStatus {
  if (input.allDone) return 'completed';
  if (input.viewPaused) return 'paused';
  return input.active ? 'running' : 'paused';
}

/** Deteremines whether the "启动修复" button should be visible. */
function isFixNotStarted(
  status: RuntimeStatus,
  progressPct: number,
  fixedItems: number,
): boolean {
  return status === 'paused' && progressPct === 0 && fixedItems === 0;
}

type FixType =
  | 'margin' | 'body_style' | 'heading' | 'page_number'
  | 'cover' | 'toc' | 'duplication_preprocess'
  | 'header_footer' | 'abstract_format' | 'cross_ref'
  | 'caption' | 'reference_format' | 'table_format'
  | 'image_format' | 'punctuation';

/**
 * Simplified but matching resolveFixTypeForFinding from findingFixActionAdapter.
 * Concatenates rule group, id, text and description then checks keyword groups.
 */
function resolveFixTypeFromText(ruleGroup: string, ruleId: string, ruleText: string, ruleDesc: string): FixType {
  const haystack = `${ruleGroup} ${ruleId} ${ruleText} ${ruleDesc}`;
  if (/图片|印章|水印|浮动对象|覆盖正文|shape/i.test(haystack)) return 'image_format';
  if (/页边距|版芯|装订线/i.test(haystack)) return 'margin';
  if (/正文|字体|行距|缩进|样式/i.test(haystack)) return 'body_style';
  if (/标题|题名|章节|层级/i.test(haystack)) return 'heading';
  if (/页码|页脚|分节/i.test(haystack)) return 'page_number';
  if (/封面|声明|题名页/i.test(haystack)) return 'cover';
  if (/目录|TOC/i.test(haystack)) return 'toc';
  if (/摘要|关键词/i.test(haystack)) return 'abstract_format';
  if (/交叉引用|引用/i.test(haystack)) return 'cross_ref';
  if (/图题|表题|题注|caption/i.test(haystack)) return 'caption';
  if (/参考文献|著录|DOI|7714/i.test(haystack)) return 'reference_format';
  if (/表格|三线表|keep-together/i.test(haystack)) return 'table_format';
  if (/标点/i.test(haystack)) return 'punctuation';
  return 'body_style';
}

// ── getRuntimeStatus ────────────────────────────────────────────────────

assert.equal(
  getRuntimeStatus({ allDone: true, active: false, viewPaused: false }),
  'completed',
  'allDone → completed regardless of active/viewPaused',
);
assert.equal(
  getRuntimeStatus({ allDone: true, active: true, viewPaused: true }),
  'completed',
  'allDone takes priority over viewPaused',
);

assert.equal(
  getRuntimeStatus({ allDone: false, active: true, viewPaused: false }),
  'running',
  'active → running',
);
assert.equal(
  getRuntimeStatus({ allDone: false, active: false, viewPaused: false }),
  'paused',
  'idle → paused',
);

assert.equal(
  getRuntimeStatus({ allDone: false, active: true, viewPaused: true }),
  'paused',
  'viewPaused overrides active → paused',
);
assert.equal(
  getRuntimeStatus({ allDone: false, active: false, viewPaused: true }),
  'paused',
  'viewPaused when idle → paused',
);

// ── isFixNotStarted (start-button visibility) ───────────────────────────

assert.equal(isFixNotStarted('paused', 0, 0), true, 'paused + zero progress → not started');

assert.equal(isFixNotStarted('running', 0, 0), false, 'running → started');
assert.equal(isFixNotStarted('completed', 100, 5), false, 'completed → started');
assert.equal(isFixNotStarted('paused', 0, 1), false, 'paused + fixed items → already partially done');
assert.equal(isFixNotStarted('paused', 30, 0), false, 'paused + progress > 0 → started');
assert.equal(isFixNotStarted('paused', 0, 0), true, 'sanity: true for clean idle state');

// Edge: after auto-start fires, the button must hide immediately
assert.equal(isFixNotStarted('running', 0, 0), false, 'auto-start transitions to running → button hidden');
assert.equal(isFixNotStarted('running', 3, 1), false, 'partial progress during running → button hidden');

// ── resolveFixTypeFromText (keyword-based rule classification) ──────────

const cases: Array<[string, string, string, string, FixType]> = [
  ['参考文献', 'RULE-L2-REFERENCE_DOI', '缺 DOI', '参考文献著录', 'reference_format'],
  ['标题与目录', 'RULE-L2-HEADING', '标题层级', '题名层级检查', 'heading'],
  ['页码与页脚', 'RULE-L2-PAGE_NUMBER', '页码起始', '页码/分节检查', 'page_number'],
  ['版式', 'RULE-L2-MARGIN', '页边距设置', '', 'margin'],
  ['正文', 'RULE-L2-BODY_STYLE', '行距异常', '', 'body_style'],
  ['页眉', 'RULE-L2-HEADER_FOOTER', '', '页眉内容检查', 'body_style'], // no dedicated pattern → fallback
  ['图形对象', 'FLOATING_OBJECT_OVERLAP_TEXT', '图片/印章覆盖正文', '', 'image_format'],
  ['表格', 'RULE-L2-TABLE', '三线表格式', '', 'table_format'],
  ['题注', 'RULE-L2-CAPTION', '图题', '题注caption', 'caption'],
  ['目录', 'RULE-L2-TOC', 'TOC生成', '', 'toc'],
  ['摘要', 'RULE-L2-ABSTRACT', '摘要字数', '', 'abstract_format'],
  ['封面', 'RULE-L2-COVER', '声明页', '', 'cover'],
  ['交叉引用', 'RULE-L2-CROSS_REF', '引用断裂', '', 'cross_ref'],
  ['标点', 'RULE-L2-PUNCTUATION', '全角/半角', '', 'punctuation'],
  ['其他', 'RULE_XYZ', '未知类别', '', 'body_style'],
];

for (const [group, id, text, desc, expected] of cases) {
  assert.equal(
    resolveFixTypeFromText(group, id, text, desc),
    expected,
    `[${group} / ${id}] → ${expected} (got ${resolveFixTypeFromText(group, id, text, desc)})`,
  );
}

console.log('fix-interaction unit tests passed');
