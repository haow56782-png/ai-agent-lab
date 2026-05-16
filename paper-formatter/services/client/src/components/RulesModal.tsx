import React, { useState, useMemo, useEffect } from 'react';
import type { SchoolProfile, ProfileRuleEntry } from '../api/client';
import { getProfileRuleStats } from './profileRulePreview';

// ── Thesis subset metadata ──

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
  page_canvas: '页面版心',
  cover: '封面',
  originality_statement: '原创性声明',
  authorization: '授权书',
  abstract_zh: '中文摘要',
  abstract_en: '英文摘要',
  keywords: '关键词',
  toc: '目录',
  heading: '标题层级',
  paragraph: '正文段落',
  header_footer: '页眉页脚',
  page_number: '页码',
  formula: '公式',
  table: '表格对象',
  table_caption: '表题',
  continuation_table: '续表',
  figure: '图片对象',
  figure_caption: '图题',
  floating_object: '浮动对象/印章/水印',
  citation: '引用标注',
  reference: '参考文献',
  footnote: '脚注',
  appendix: '附录',
  acknowledgement: '致谢',
  translated_source: '外文原文及译文',
  section_break: '分节符与分页',
  directory_field: '自动目录/图目录/表目录域',
};

// ── Formatting helpers ──

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

// ── Data structures ──

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

    // Merge before/after pairs onto one line (e.g. "一级标题段前" + "一级标题段后")
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

// ── Responsive hook ──

function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return narrow;
}

// ── Types ──

type SchoolLike = {
  name: string;
  faculty?: string;
  version?: string;
  rules?: number;
};

interface RulesModalProps {
  onClose: () => void;
  school?: SchoolLike | null;
  profileDetail?: SchoolProfile | null;
}

// ── Component ──

const RulesModal: React.FC<RulesModalProps> = ({ onClose, school, profileDetail }) => {
  const narrow = useNarrow();
  const ruleStats = getProfileRuleStats(profileDetail);
  const schoolTitle = school ? [school.name, school.faculty || ''].filter(Boolean).join(' · ') : '';

  const allEntries = useMemo(() => {
    if (!profileDetail) return [];
    return [
      ...(profileDetail.rulesJson || []),
      ...(profileDetail.styleMap || []),
    ];
  }, [profileDetail]);

  const subsets = useMemo(() => buildSubsetGroups(allEntries), [allEntries]);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeSubset = subsets[activeIndex] || null;

  useEffect(() => { setActiveIndex(0); }, [profileDetail]);

  // ── Sub-renderers ──

  const renderSidebar = () => (
    <div
      style={{
        width: narrow ? '100%' : 220,
        minWidth: narrow ? undefined : 220,
        borderRight: narrow ? 'none' : '1px solid var(--hair)',
        borderBottom: narrow ? '1px solid var(--hair)' : 'none',
        overflow: narrow ? 'auto' : 'hidden auto',
        display: 'flex',
        flexDirection: narrow ? 'row' : 'column',
        gap: 1,
        padding: narrow ? '8px 12px' : '6px 0',
        background: 'var(--paper-0)',
      }}
    >
      {narrow
        ? subsets.map((s, i) => (
            <button
              key={s.thesisSubset}
              onClick={() => setActiveIndex(i)}
              style={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '6px 10px',
                border: 'none',
                borderRadius: 6,
                background: i === activeIndex ? 'var(--brand-100)' : 'transparent',
                color: i === activeIndex ? 'var(--brand-900)' : 'var(--ink-500)',
                cursor: 'pointer',
                fontSize: 11.5,
                whiteSpace: 'nowrap',
              }}
            >
              <span className="mono" style={{ fontSize: 10, opacity: 0.6 }}>{s.categoryCode}</span>
              <span>{s.label}</span>
              <span className="mono" style={{ fontSize: 10, opacity: 0.4, marginLeft: 2 }}>{s.rules.length}</span>
            </button>
          ))
        : subsets.map((s, i) => (
            <button
              key={s.thesisSubset}
              onClick={() => setActiveIndex(i)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '9px 12px',
                border: 'none',
                borderLeft: i === activeIndex ? '3px solid var(--brand-500)' : '3px solid transparent',
                background: i === activeIndex ? 'var(--brand-50)' : 'transparent',
                color: i === activeIndex ? 'var(--brand-900)' : 'var(--ink-700)',
                cursor: 'pointer',
                fontSize: 12,
                textAlign: 'left',
              }}
            >
              <span className="mono" style={{
                fontSize: 10,
                color: i === activeIndex ? 'var(--brand-500)' : 'var(--ink-400)',
                minWidth: 22,
              }}>
                {s.categoryCode}
              </span>
              <span style={{ flex: 1 }}>{s.label}</span>
              <span className="mono" style={{
                fontSize: 10,
                color: 'var(--ink-400)',
                background: i === activeIndex ? 'var(--brand-100)' : 'var(--paper-2)',
                borderRadius: 8,
                padding: '1px 6px',
              }}>
                {s.rules.length}
              </span>
            </button>
          ))}
    </div>
  );

  const renderRules = () => {
    if (!activeSubset) return null;

    return (
      <div style={{ flex: 1, overflow: 'auto', padding: '14px 20px' }}>
        {/* Panel header */}
        <div style={{ marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid var(--hair)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span className="mono" style={{
              fontSize: 10.5, color: 'var(--brand-500)',
              background: 'var(--brand-50)', borderRadius: 4, padding: '2px 6px',
            }}>
              {activeSubset.categoryCode}
            </span>
            <strong style={{ fontSize: 14, color: 'var(--ink-900)' }}>
              {activeSubset.category}
            </strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--ink-500)' }}>
            <span>已纳入校验</span>
            <span>·</span>
            <span>{activeSubset.rules.length} 条规则</span>
          </div>
        </div>

        {/* Rule cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {activeSubset.rules.map((rule, idx) => (
            <div
              key={rule.key}
              style={{
                borderRadius: 6,
                border: '1px solid var(--hair)',
                background: 'var(--paper-0)',
                padding: '10px 12px',
              }}
            >
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span className="mono" style={{
                  fontSize: 10, color: 'var(--ink-300)',
                  minWidth: 20, textAlign: 'right', marginTop: 1, flexShrink: 0,
                }}>
                  {idx + 1}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-700)', lineHeight: 1.55 }}>
                    {rule.text}
                  </div>
                  {rule.value && (
                    <div style={{
                      fontSize: 11.5, color: 'var(--brand-500)', marginTop: 4,
                    }}>
                      {rule.value}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ── Main render ──

  const hasRules = ruleStats.hasRules;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(21,23,27,.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
          animation: 'protoFade .18s ease',
        }}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'var(--paper-0)',
          borderRadius: 6,
          width: narrow ? '92vw' : 820,
          maxWidth: 'calc(100vw - 24px)',
          maxHeight: narrow ? '92vh' : '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-card)',
          zIndex: 1000,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 22px',
            borderBottom: '1px solid var(--hair)',
          }}
        >
          <div>
            <div className="serif" style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink-900)' }}>
              这篇论文将遵循的完整规则
            </div>
            <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-500)', marginTop: 2 }}>
              {school
                ? `${schoolTitle} · ${school.version || 'vAuto'} · ${ruleStats.totalRules || school.rules || 0} 条 · ${subsets.length} 个元子集`
                : '请先选择学校规范'}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 14, border: 'none',
              background: 'var(--paper-2)', cursor: 'pointer', fontSize: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--ink-500)', flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Info banner */}
        <div
          style={{
            padding: '8px 22px',
            borderBottom: '1px solid var(--hair)',
            fontSize: 11.5,
            color: 'var(--ink-500)',
            lineHeight: 1.5,
            background: 'var(--paper-1)',
          }}
        >
          系统将按论文元子集逐一校验：从左栏选择部分，右侧查看具体规则。学校规则优先，未覆盖的回落国标基线和默认规则。
        </div>

        {hasRules && subsets.length > 0 ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: narrow ? 'column' : 'row',
              overflow: 'hidden',
              minHeight: 0,
            }}
          >
            {renderSidebar()}
            {renderRules()}
          </div>
        ) : (
          <div style={{ padding: '18px 22px 20px', overflow: 'auto' }}>
            <div style={{ fontSize: 12, color: 'var(--ink-600)', lineHeight: 1.7, marginBottom: 12 }}>
              当前识别到的是学校档案，还不是已经录入系统的正式规则包，所以这里不会再伪装成一套完整规范。
            </div>
            <div
              style={{
                border: '1px dashed var(--hair)', borderRadius: 6,
                background: 'var(--paper-1)', padding: '14px 12px',
                fontSize: 12, color: 'var(--ink-700)', lineHeight: 1.7,
              }}
            >
              <div style={{ fontWeight: 600, color: 'var(--ink-900)', marginBottom: 6 }}>这所学校还处在待补规则状态。</div>
              <div>你现在能继续选择它，但系统应用的仍会是国标基线和已有 finding 识别能力；如果要严格按本校版式落地，还需要补录这所学校的正式规则包。</div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default RulesModal;
