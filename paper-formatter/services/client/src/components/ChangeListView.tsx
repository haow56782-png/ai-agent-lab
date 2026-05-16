// ChangeListView — card-based thesis change list, student-friendly default view.
// Replaces the Before/After double-pane diff as the primary confirmation surface.
// Clicking "查看原文" switches to document comparison view + focuses the finding.

import React, { useMemo, useState } from 'react';
import { reviewActions } from '../stores/reviewStore';
import type { Finding } from '../stores/reviewStore';
import type { DiffCopyShape } from '../screens/step4-diff/diffCopy';

type DocSection =
  | 'cover'
  | 'declaration'
  | 'abstract'
  | 'toc'
  | 'body'
  | 'reference'
  | 'appendix'
  | 'acknowledgement'
  | 'other';

const DOC_SECTION_ORDER: DocSection[] = [
  'cover', 'declaration', 'abstract', 'toc', 'body', 'reference', 'appendix', 'acknowledgement', 'other',
];

const DOC_SECTION_LABELS: Record<DocSection, string> = {
  cover: '封面',
  declaration: '声明页',
  abstract: '摘要',
  toc: '目录',
  body: '正文',
  reference: '参考文献',
  appendix: '附录',
  acknowledgement: '致谢',
  other: '其他',
};

/** Heuristic: guess the document section from the finding's rule group and page context. */
function guessSection(finding: Finding): DocSection {
  const group = (finding.rule_group ?? '').toLowerCase();
  const breadcrumb = finding.ruleBreadcrumb.join(' ').toLowerCase();
  const suggestion = (finding.suggestionText ?? '').toLowerCase();

  if (/cover|封面|题名页|声明|declaration|授权|authorization|originality/i.test(`${group} ${breadcrumb} ${suggestion}`)) {
    if (/声明|declaration|originality/i.test(`${group} ${breadcrumb}`)) return 'declaration';
    return 'cover';
  }
  if (/abstract|摘要/i.test(`${group} ${breadcrumb}`)) return 'abstract';
  if (/toc|目录|directory/i.test(`${group} ${breadcrumb}`)) return 'toc';
  if (/reference|参考文献|引用|doi/i.test(`${group} ${breadcrumb}`)) return 'reference';
  if (/appendix|附录/i.test(`${group} ${breadcrumb}`)) return 'appendix';
  if (/acknowledgement|致谢/i.test(`${group} ${breadcrumb}`)) return 'acknowledgement';
  if (/heading|标题|正文|body|段落|字体|字号|行距|缩进|页眉|页脚|页码|脚注/i.test(`${group} ${breadcrumb} ${suggestion}`)) return 'body';
  return 'other';
}

interface ChangeListViewProps {
  copy: DiffCopyShape;
  findings: Finding[];
  /** Called when user clicks "查看原文位置" — should switch to document diff view + focus finding */
  onViewOriginal: (findingId: string) => void;
}

interface SectionGroup {
  section: DocSection;
  label: string;
  findings: Finding[];
}

function severityGlyph(severity: string): string {
  if (severity === 'P0') return '❗';
  if (severity === 'P1') return '⚠️';
  return '';
}

function statusBadge(finding: Finding): { text: string; className: string } {
  switch (finding.status) {
    case 'accepted': return { text: '✓ 已接受', className: 'cl-badge-accepted' };
    case 'rejected': return { text: '✕ 已忽略', className: 'cl-badge-rejected' };
    case 'self_edited': return { text: '✎ 已自改', className: 'cl-badge-self-edited' };
    default: return { text: '', className: '' };
  }
}

export const ChangeListView: React.FC<ChangeListViewProps> = ({ copy, findings, onViewOriginal }) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(DOC_SECTION_ORDER));

  const grouped = useMemo(() => {
    const groups = new Map<DocSection, Finding[]>();
    for (const finding of findings) {
      const section = guessSection(finding);
      if (!groups.has(section)) groups.set(section, []);
      groups.get(section)!.push(finding);
    }
    const result: SectionGroup[] = [];
    for (const section of DOC_SECTION_ORDER) {
      const items = groups.get(section);
      if (items && items.length > 0) {
        result.push({ section, label: DOC_SECTION_LABELS[section], findings: items });
      }
    }
    return result;
  }, [findings]);

  const pendingCount = findings.filter((f) => f.status === 'pending').length;
  const doneCount = findings.filter((f) => f.status !== 'pending').length;

  const toggleSection = (section: DocSection) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  if (findings.length === 0) {
    return (
      <div className="change-list-empty">
        <div className="change-list-empty-icon">✅</div>
        <div className="change-list-empty-title">{copy.review_empty_title}</div>
        <div className="change-list-empty-body">{copy.review_empty_body}</div>
      </div>
    );
  }

  return (
    <section className="change-list-view" style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '24px 32px' }}>
      {/* Header */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
          变更清单
        </h2>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          {pendingCount > 0
            ? `共 ${findings.length} 处变更 · ${pendingCount} 处待确认`
            : `共 ${findings.length} 处变更 · 全部已确认`}
        </span>
      </div>

      {/* No-op scenario: everything passes */}
      {pendingCount === 0 && doneCount > 0 && (
        <div className="change-list-all-clear" style={{
          background: 'var(--status-pass-bg)',
          border: '1px solid var(--status-pass)',
          borderRadius: 8,
          padding: '20px 24px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <span style={{ fontSize: 28 }}>✅</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--status-pass)' }}>所有格式已确认，可以导出了 🎉</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
              已完成 {doneCount} 处格式变更的确认，论文排版符合学校规范
            </div>
          </div>
        </div>
      )}

      {/* Section groups */}
      {grouped.map((group) => {
        const isExpanded = expandedSections.has(group.section);
        const pendingInGroup = group.findings.filter((f) => f.status === 'pending').length;
        return (
          <div key={group.section} style={{ marginBottom: 16 }}>
            {/* Section header */}
            <button
              type="button"
              onClick={() => toggleSection(group.section)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-light)',
                borderRadius: 8,
                padding: '10px 16px',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--text-primary)',
                transition: 'background 200ms',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-surface)'; }}
            >
              <span style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 150ms', display: 'inline-block' }}>▶</span>
              <span>{group.label}</span>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 400 }}>
                ({group.findings.length} 处修改
                {pendingInGroup > 0 ? ` · ${pendingInGroup} 待确认` : ''})
              </span>
            </button>

            {/* Cards */}
            {isExpanded && (
              <div style={{ padding: '8px 4px 0' }}>
                {group.findings.map((finding) => {
                  const badge = statusBadge(finding);
                  const isPending = finding.status === 'pending';
                  const sevIcon = severityGlyph(finding.severity ?? '');

                  return (
                    <div
                      key={finding.finding_id}
                      className={`change-list-card ${isPending ? 'cl-pending' : 'cl-resolved'}`}
                      style={{
                        background: isPending ? 'var(--bg-surface)' : 'var(--bg-canvas)',
                        border: `1px solid ${isPending ? 'var(--border-light)' : 'var(--border-subtle)'}`,
                        borderRadius: 8,
                        padding: '14px 16px',
                        marginBottom: 8,
                        transition: 'opacity 200ms, border-color 200ms',
                        opacity: isPending ? 1 : 0.72,
                        cursor: 'pointer',
                      }}
                      onClick={() => reviewActions.setFocus(finding.finding_id, 'pane')}
                      tabIndex={0}
                      role="article"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') reviewActions.setFocus(finding.finding_id, 'pane');
                      }}
                    >
                      {/* Top row: title + severity + badge */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', flex: 1 }}>
                          {sevIcon && <span style={{ marginRight: 4 }}>{sevIcon}</span>}
                          {finding.problem || finding.ruleBreadcrumb.at(-1) || '格式变更'}
                        </span>
                        {badge.text && (
                          <span className={badge.className} style={{
                            fontSize: 11,
                            padding: '2px 8px',
                            borderRadius: 10,
                            background: finding.status === 'accepted'
                              ? 'var(--status-pass-bg)'
                              : finding.status === 'rejected'
                                ? 'var(--status-ignored-bg)'
                                : 'var(--status-review-bg)',
                            color: finding.status === 'accepted'
                              ? 'var(--status-pass)'
                              : finding.status === 'rejected'
                                ? 'var(--status-ignored)'
                                : 'var(--status-review)',
                            fontWeight: 500,
                          }}>
                            {badge.text}
                          </span>
                        )}
                      </div>

                      {/* Location tag */}
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 8 }}>
                        第 {finding.pageNo} 页 · {DOC_SECTION_LABELS[guessSection(finding)]}
                      </div>

                      {/* Before / After */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 8,
                        marginBottom: 8,
                        fontSize: 13,
                      }}>
                        <div style={{
                          background: 'var(--bg-canvas)',
                          borderRadius: 4,
                          padding: '6px 10px',
                          border: '1px solid var(--border-subtle)',
                        }}>
                          <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 2 }}>修改前</div>
                          <div style={{ color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                            {finding.before || '—'}
                          </div>
                        </div>
                        <div style={{
                          background: 'var(--bg-canvas)',
                          borderRadius: 4,
                          padding: '6px 10px',
                          border: '1px solid var(--border-subtle)',
                        }}>
                          <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 2 }}>修改后</div>
                          <div style={{ color: 'var(--status-pass)', wordBreak: 'break-all', fontWeight: 500 }}>
                            {finding.after || '—'}
                          </div>
                        </div>
                      </div>

                      {/* Rule reference + suggestion */}
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 8 }}>
                        {finding.suggestionText && (
                          <span>{finding.suggestionText.slice(0, 120)}</span>
                        )}
                      </div>

                      {/* Bottom actions */}
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewOriginal(finding.finding_id);
                          }}
                          style={{
                            fontSize: 12,
                            color: 'var(--link-color)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                            textDecoration: 'underline',
                          }}
                        >
                          查看原文位置 →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
};
