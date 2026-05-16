// RulesModal subset group tests — verify buildSubsetGroups merges before/after
// pairs (e.g. heading_before_pt + heading_after_pt) into one row.
import assert from 'node:assert/strict';

// ── Types (subset of ProfileRuleEntry used by buildSubsetGroups) ─────────────

interface ProfileRuleEntry {
  ruleId?: string;
  label?: string;
  category?: string;
  categoryCode?: string;
  source?: string;
  thesisSubset?: string;
  targetObject?: string;
  uiSection?: string;
  value?: unknown;
  unit?: string;
  allowedFonts?: string[];
}

// ── Helpers under test (duplicated from RulesModal.tsx) ─────────────────────

function fmtValue(value: unknown, unit?: string): string {
  if (Array.isArray(value)) return value.map(String).join(' / ');
  if (value == null || value === '') return unit ? `0 ${unit}` : '';
  if (typeof value === 'number') {
    const n = Number.isInteger(value) ? String(value) : Number(value.toFixed(2)).toString();
    return unit ? `${n} ${unit}` : n;
  }
  return unit ? `${String(value)} ${unit}` : String(value);
}

function getRuleText(entry: ProfileRuleEntry): string {
  const description = typeof entry.description === 'string' ? entry.description.trim() : '';
  if (description) return description;
  if (typeof entry.label === 'string' && entry.label.trim()) return entry.label;
  if (typeof entry.ruleId === 'string' && entry.ruleId.trim()) return entry.ruleId;
  return '未命名规则';
}

function getRuleValue(entry: ProfileRuleEntry): string | null {
  if (Array.isArray(entry.allowedFonts) && entry.allowedFonts.length > 0) {
    return `字体：${entry.allowedFonts.join(' / ')}`;
  }
  if (entry.value !== undefined && entry.value !== null && entry.value !== '') {
    return fmtValue(entry.value, entry.unit);
  }
  return null;
}

const BA_RE = /^(.+)_(before|after)_([^_]+)$/;

function combineLabels(a: string, b: string): string {
  let commonLen = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] === b[i]) commonLen++;
    else break;
  }
  if (commonLen >= 2) {
    return a + "/" + b.substring(commonLen);
  }
  return a + " / " + b;
}

interface RuleItem {
  key: string;
  text: string;
  value: string | null;
  hasValue: boolean;
}

interface SubsetGroup {
  thesisSubset: string;
  label: string;
  category: string;
  categoryCode: string;
  rules: RuleItem[];
}

const SUBSET_FLOW: string[] = [
  'page_canvas', 'cover', 'originality_statement', 'authorization',
  'abstract_zh', 'abstract_en', 'keywords', 'toc',
  'heading', 'paragraph', 'header_footer', 'page_number',
  'formula', 'table', 'table_caption', 'continuation_table',
  'figure', 'figure_caption', 'floating_object',
  'citation', 'reference', 'footnote',
  'appendix', 'acknowledgement', 'translated_source',
  'section_break', 'directory_field',
];

const SUBSET_LABEL: Record<string, string> = {
  heading: '标题层级',
  paragraph: '正文段落',
  page_canvas: '页面版心',
};

function buildSubsetGroups(entries: ProfileRuleEntry[]): SubsetGroup[] {
  const map = new Map<string, SubsetGroup>();
  let i = 0;
  while (i < entries.length) {
    const entry = entries[i];
    const s = entry.thesisSubset || '__other';
    let group = map.get(s);
    if (!group) {
      group = {
        thesisSubset: s,
        label: SUBSET_LABEL[s] || s,
        category: entry.category || '未分类',
        categoryCode: entry.categoryCode || '99',
        rules: [],
      };
      map.set(s, group);
    }

    // Merge before/after pairs onto one line
    const next = entries[i + 1];
    const em = entry.ruleId?.match(BA_RE);
    const nm = next?.ruleId?.match(BA_RE);
    if (
      em && nm && em[1] === nm[1] && em[3] === nm[3] &&
      em[2] === 'before' && nm[2] === 'after' &&
      entry.thesisSubset === next.thesisSubset &&
      entry.category === next.category
    ) {
      group.rules.push({
        key: `${entry.ruleId}-${group.rules.length}`,
        text: combineLabels(getRuleText(entry), getRuleText(next)),
        value: `${getRuleValue(entry) || fmtValue(entry.value, entry.unit)} / ${getRuleValue(next) || fmtValue(next.value, next.unit)}`,
        hasValue: true,
      });
      i += 2;
      continue;
    }

    group.rules.push({
      key: `${entry.ruleId || entry.label || 'rule'}-${group.rules.length}`,
      text: getRuleText(entry),
      value: getRuleValue(entry),
      hasValue: entry.value !== undefined || Array.isArray(entry.allowedFonts),
    });
    i++;
  }
  return [...map.values()].sort((a, b) => {
    const ai = SUBSET_FLOW.indexOf(a.thesisSubset);
    const bi = SUBSET_FLOW.indexOf(b.thesisSubset);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
}

// ── combineLabels ───────────────────────────────────────────────────────────

assert.equal(
  combineLabels('一级标题段前', '一级标题段后'),
  '一级标题段前/后',
  'heading before/after merge',
);

assert.equal(
  combineLabels('上边距', '下边距'),
  '上边距 / 下边距',
  'margin top/bottom with single-char diff — no common prefix',
);

assert.equal(
  combineLabels('左', '右'),
  '左 / 右',
  'short labels — no common prefix ≥2',
);

assert.equal(
  combineLabels('字体：宋体', '字体：黑体'),
  '字体：宋体/黑体',
  'labels with common prefix "字体：" and differing font name',
);

// ── buildSubsetGroups: heading before/after merge ───────────────────────────

{
  const headingBefore: ProfileRuleEntry = {
    ruleId: 'heading_before_pt', label: '一级标题段前', value: 30, unit: 'pt',
    category: '09. 标题层级', categoryCode: '09', source: 'school',
    thesisSubset: 'heading', targetObject: '章节标题', uiSection: '正文',
  };
  const headingAfter: ProfileRuleEntry = {
    ruleId: 'heading_after_pt', label: '一级标题段后', value: 12, unit: 'pt',
    category: '09. 标题层级', categoryCode: '09', source: 'school',
    thesisSubset: 'heading', targetObject: '章节标题', uiSection: '正文',
  };

  const groups = buildSubsetGroups([headingBefore, headingAfter]);
  assert.equal(groups.length, 1, 'one group for heading');
  assert.equal(groups[0].rules.length, 1, 'two entries merged into one rule row');
  assert.equal(groups[0].rules[0].text, '一级标题段前/后', 'merged label');
  assert.equal(groups[0].rules[0].value, '30 pt / 12 pt', 'combined value');
  assert.equal(groups[0].rules[0].hasValue, true, 'has value');
}

// ── buildSubsetGroups: non-before/after entries pass through ────────────────

{
  const marginTop: ProfileRuleEntry = {
    ruleId: 'margin_top_mm', label: '上边距', value: 25, unit: 'mm',
    category: '01. 页面与纸张', categoryCode: '01', source: 'school',
    thesisSubset: 'page_canvas', targetObject: '页面/版心', uiSection: '页面',
  };
  const lineSpacing: ProfileRuleEntry = {
    ruleId: 'line_spacing', label: '正文行距', value: 28,
    category: '10. 正文段落', categoryCode: '10', source: 'school',
    thesisSubset: 'paragraph', targetObject: '正文段落', uiSection: '正文',
  };

  const groups = buildSubsetGroups([marginTop, lineSpacing]);
  assert.equal(groups.length, 2, 'two groups');
  assert.equal(groups[0].rules.length, 1, 'page_canvas: one rule (no merge)');
  assert.equal(groups[1].rules.length, 1, 'paragraph: one rule (no merge)');
  assert.equal(groups[0].rules[0].text, '上边距', 'text unchanged');
  assert.equal(groups[0].rules[0].value, '25 mm', 'value unchanged');
}

// ── buildSubsetGroups: mixed — merge only the before/after pair ────────────

{
  const marginTop: ProfileRuleEntry = {
    ruleId: 'margin_top_mm', label: '上边距', value: 25, unit: 'mm',
    category: '01. 页面与纸张', categoryCode: '01', source: 'school',
    thesisSubset: 'page_canvas', targetObject: '页面/版心', uiSection: '页面',
  };
  const marginBottom: ProfileRuleEntry = {
    ruleId: 'margin_bottom_mm', label: '下边距', value: 25, unit: 'mm',
    category: '01. 页面与纸张', categoryCode: '01', source: 'school',
    thesisSubset: 'page_canvas', targetObject: '页面/版心', uiSection: '页面',
  };
  const headingBefore: ProfileRuleEntry = {
    ruleId: 'heading_before_pt', label: '一级标题段前', value: 30, unit: 'pt',
    category: '09. 标题层级', categoryCode: '09', source: 'school',
    thesisSubset: 'heading', targetObject: '章节标题', uiSection: '正文',
  };
  const headingAfter: ProfileRuleEntry = {
    ruleId: 'heading_after_pt', label: '一级标题段后', value: 12, unit: 'pt',
    category: '09. 标题层级', categoryCode: '09', source: 'school',
    thesisSubset: 'heading', targetObject: '章节标题', uiSection: '正文',
  };

  const groups = buildSubsetGroups([marginTop, marginBottom, headingBefore, headingAfter]);
  assert.equal(groups.length, 2, 'two groups: page_canvas + heading');

  const pageCanvas = groups.find(g => g.thesisSubset === 'page_canvas');
  const heading = groups.find(g => g.thesisSubset === 'heading');
  assert.ok(pageCanvas, 'page_canvas group exists');
  assert.ok(heading, 'heading group exists');

  assert.equal(pageCanvas!.rules.length, 2, 'margin_top + margin_bottom = 2 separate rows (no merge — not before/after)');
  assert.equal(heading!.rules.length, 1, 'heading before+after merged into 1 row');
  assert.equal(heading!.rules[0].text, '一级标题段前/后', 'merged heading label');
  assert.equal(heading!.rules[0].value, '30 pt / 12 pt', 'merged heading value');
}

// ── buildSubsetGroups: only consecutive before+after pairs merge ───────────

{
  const before: ProfileRuleEntry = {
    ruleId: 'heading_before_pt', label: '一级标题段前', value: 30, unit: 'pt',
    category: '09. 标题层级', categoryCode: '09', source: 'school',
    thesisSubset: 'heading',
  };
  const unrelated: ProfileRuleEntry = {
    ruleId: 'heading_font', label: '标题字体', value: '黑体',
    category: '09. 标题层级', categoryCode: '09', source: 'school',
    thesisSubset: 'heading',
  };
  const after: ProfileRuleEntry = {
    ruleId: 'heading_after_pt', label: '一级标题段后', value: 12, unit: 'pt',
    category: '09. 标题层级', categoryCode: '09', source: 'school',
    thesisSubset: 'heading',
  };

  const groups = buildSubsetGroups([before, unrelated, after]);
  assert.equal(groups.length, 1, 'one heading group');
  // before and after are not consecutive — should NOT merge
  assert.equal(groups[0].rules.length, 3, 'non-consecutive → 3 separate rows');
  assert.equal(groups[0].rules[0].text, '一级标题段前', 'first row unchanged');
  assert.equal(groups[0].rules[2].text, '一级标题段后', 'last row unchanged');
}

// ── buildSubsetGroups: different thesisSubset prevents merge ───────────────

{
  const before: ProfileRuleEntry = {
    ruleId: 'heading_before_pt', label: '一级标题段前', value: 30, unit: 'pt',
    category: '09. 标题层级', categoryCode: '09', source: 'school',
    thesisSubset: 'heading',
  };
  const after: ProfileRuleEntry = {
    ruleId: 'heading_after_pt', label: '一级标题段后', value: 12, unit: 'pt',
    category: '09. 标题层级', categoryCode: '09', source: 'school',
    thesisSubset: 'paragraph', // different subset!
  };

  const groups = buildSubsetGroups([before, after]);
  assert.equal(groups.length, 2, 'different subsets → two groups');
}

// ── buildSubsetGroups: different category prevents merge ───────────────────

{
  const before: ProfileRuleEntry = {
    ruleId: 'heading_before_pt', label: '一级标题段前', value: 30, unit: 'pt',
    category: '09. 标题层级', categoryCode: '09', source: 'school',
    thesisSubset: 'heading',
  };
  const after: ProfileRuleEntry = {
    ruleId: 'heading_after_pt', label: '一级标题段后', value: 12, unit: 'pt',
    category: '99. 其他', categoryCode: '99', source: 'school', // different category!
    thesisSubset: 'heading',
  };

  const groups = buildSubsetGroups([before, after]);
  // Different category → should still merge if within same group since the merge
  // check only blocks on category match. Let's see: same thesisSubset "heading"
  // First entry creates group with category '09. 标题层级'
  // Second entry has same thesisSubset → same group, but different category
  // Merge check: entry.category === next.category → false → no merge
  //
  // But the second entry has a different category than the group's stored category.
  // The group stores entry.category from the first occurrence.
  // Whether this matters visually depends — category affects the panel header.
  // For this test we just verify they don't merge.
  assert.equal(groups[0].rules.length, 2, 'different categories → no merge');
}

// ── combineLabels edge cases ────────────────────────────────────────────────

assert.equal(combineLabels('ABC', 'ABD'), 'ABC/D', 'English prefix overlap');
assert.equal(combineLabels('same', 'same'), 'same/', 'identical labels');
assert.equal(combineLabels('', 'foo'), ' / foo', 'empty first label');
assert.equal(combineLabels('foo', ''), 'foo / ', 'empty second label');

console.log('rules-modal-subset-groups unit tests passed');
