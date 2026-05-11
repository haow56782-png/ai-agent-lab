import React from 'react';

export interface DiffItem {
  type: 'structural' | 'format' | 'content';
  desc: string;
  paraIndex: number;
  beforeText?: string;
  afterText?: string;
}

const PARAS_PER_PAGE = 28;

function pageParagraphs(texts: string[], page: number): string[] {
  const start = (page - 1) * PARAS_PER_PAGE;
  return texts.slice(start, start + PARAS_PER_PAGE);
}

function pickFirstLine(paras: string[]): string {
  for (const p of paras) {
    const t = p.trim();
    if (t.length > 4) return t;
  }
  return '';
}

interface DiffPageProps {
  variant: 'before' | 'after';
  page: number;
  changed: boolean;
  texts: string[];
  highlightLabel?: string | null;
  onPageClick?: () => void;
  pageRuleCount?: number;
  diffItems?: DiffItem[];
  diffMode?: 'side-by-side' | 'unified';
  tooltip?: string | null;
  onDiffHover?: (desc: string | null, x: number, y: number) => void;
}

export const DiffPage: React.FC<DiffPageProps> = ({
  variant, page, changed, texts, highlightLabel, onPageClick, pageRuleCount,
  diffItems = [], diffMode, tooltip, onDiffHover,
}) => {
  const after = variant === 'after';
  const unified = diffMode === 'unified';
  const pageParas = pageParagraphs(texts, page);
  const contentParas = pageParas.filter(p => p.trim().length > 6).slice(0, 6);
  const firstLine = pickFirstLine(pageParas);
  void tooltip;

  const hasStructural = diffItems.some(d => d.type === 'structural');
  const structuralItems = diffItems.filter(d => d.type === 'structural');

  const getParaDiffs = (i: number) => diffItems.filter(d => d.paraIndex === i);

  return (
    <div onClick={onPageClick} style={{
      cursor: onPageClick ? 'pointer' : 'default',
      width: unified ? 680 : 360, background: '#fff',
      borderRadius: '4px', overflow: 'hidden',
      position: 'relative',
      border: changed ? '1.5px solid var(--brand-800)' : '1px solid var(--hair-strong)',
      boxShadow: changed ? '0 0 0 2px rgba(30,58,95,.08)' : '0 1px 4px rgba(21,23,27,.06)',
      transition: 'box-shadow .15s',
    }}>
      {/* Ribbon */}
      <div style={{
        height: after ? 3 : 2, background: after
          ? 'linear-gradient(90deg, var(--leaf-400), var(--leaf-600))'
          : 'var(--paper-3)',
      }} />
      {changed && <div style={{
        position: 'absolute', right: 0, top: 12, zIndex: 2,
        background: 'var(--brand-800)', color: '#fff',
        fontSize: 8.5, fontWeight: 600, fontFamily: 'var(--mono)',
        padding: '2px 7px', borderRadius: '3px 0 0 3px',
      }}>CHANGED</div>}

      {/* Header */}
      <div style={{ padding: '8px 10px 6px', borderBottom: '1px solid var(--hair)' }}>
        <div style={{
          fontFamily: 'var(--serif)', fontSize: 10, textAlign: 'right',
          color: 'var(--ink-400)', marginBottom: 6,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {after ? '修改后 · AFTER' : '修改前 · BEFORE'}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
          <div style={{
            fontSize: 12, fontWeight: 600, color: 'var(--ink-900)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
          }}>
            {firstLine || `第 ${page} 页`}
          </div>
          <div className="mono" style={{ fontSize: 10, color: 'var(--ink-400)' }}>
            p.{page}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '6px 10px 10px', position: 'relative' }}>
        {contentParas.length === 0 ? (
          <div style={{
            fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 11,
            color: 'var(--ink-400)', textAlign: 'center', padding: '16px 0',
          }}>
            （这一页暂时没有可对照的正文内容）
          </div>
        ) : (
          <>
            {changed && (
              <div className="mono" style={{
                fontSize: 9, color: 'var(--brand-800)', marginBottom: 6,
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <span style={{ fontSize: 7 }}>●</span> {highlightLabel || '这一页有需要你确认的变化'}
              </div>
            )}
            {contentParas.map((t, i) => {
              const paraDiffs = getParaDiffs(i);
              const fmtDiff = paraDiffs.find(d => d.type === 'format');
              const contentDiff = paraDiffs.find(d => d.type === 'content');
              return (
                <div key={i} style={{
                  position: 'relative', marginBottom: 4,
                  padding: '4px 0 2px',
                  borderBottom: '1px dashed var(--hair)',
                  background: contentDiff ? 'rgba(184,84,47,.04)' : 'transparent',
                }}>
                  <div style={{
                    fontFamily: 'var(--serif)', fontSize: 10.5, lineHeight: 1.5,
                    color: 'var(--ink-800)', display: 'flex', gap: 4,
                  }}>
                    <span className="mono" style={{
                      fontSize: 7, color: 'var(--ink-400)', marginTop: 2,
                    }}>{i + 1}</span>
                    <span style={{ flex: 1 }}>
                      {contentDiff && after ? (
                        <span style={{ color: 'var(--leaf-800)' }}>{contentDiff.afterText || t}</span>
                      ) : contentDiff && !after ? (
                        <span style={{ color: 'var(--rust-700)', textDecoration: 'line-through' }}>{contentDiff.beforeText || t}</span>
                      ) : fmtDiff ? (
                        <span style={{ borderBottom: '1px dashed var(--sun-600)', paddingBottom: 1 }}>{t}</span>
                      ) : (t)}
                    </span>
                  </div>
                  {fmtDiff && (
                    <div className="mono" style={{
                      fontSize: 8.5, color: 'var(--sun-700)', marginTop: 2,
                      paddingLeft: 14,
                    }}>
                      {fmtDiff.desc}
                    </div>
                  )}
                  {contentDiff && (
                    <div
                      className="mono"
                      style={{ fontSize: 8.5, marginTop: 2, paddingLeft: 14 }}
                      onMouseEnter={(e) => {
                        if (!onDiffHover) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        onDiffHover(contentDiff.desc, rect.left, rect.top - 4);
                      }}
                      onMouseLeave={() => { if (onDiffHover) onDiffHover(null, 0, 0); }}
                    >
                      {after ? (
                        <span style={{ color: 'var(--leaf-700)' }}>✓ 已按规范推进: {contentDiff.desc}</span>
                      ) : (
                        <span style={{ color: 'var(--rust-600)' }}>✗ 原稿状态: {contentDiff.desc}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {hasStructural && (
              <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {structuralItems.map((d, i) => (
                  <div key={i} className="mono" style={{
                    fontSize: 8.5, color: after ? 'var(--leaf-700)' : 'var(--brand-700)',
                    background: after ? 'rgba(132,190,132,.04)' : 'rgba(30,58,95,.04)',
                    padding: '2px 6px', borderRadius: 2,
                  }}>
                    {after ? '✓' : '→'} {d.desc}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer stats */}
      <div style={{
        borderTop: '1px solid var(--hair)', padding: '5px 10px',
        display: 'flex', justifyContent: 'space-between',
        fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-400)',
      }}>
        <span>{pageParas.length} 段内容</span>
        {pageRuleCount != null && pageRuleCount > 0 && (
          <span style={{ color: 'var(--rust-600)', fontWeight: 600 }}>{pageRuleCount} 处待核对</span>
        )}
      </div>

      {/* Page gutter decorations */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 12,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 2,
        background: unified ? 'var(--paper-1)' : 'transparent',
      }}>
        {hasStructural && !unified && <div style={{
          width: 4, height: 4, borderRadius: 2,
          background: 'var(--brand-400)',
        }} />}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: 'absolute', bottom: '100%', right: 0,
          background: 'var(--ink-900)', color: 'var(--paper-0)',
          padding: '4px 8px', borderRadius: 3,
          fontFamily: 'var(--mono)', fontSize: 9.5,
          whiteSpace: 'nowrap', marginBottom: 4,
          zIndex: 20, pointerEvents: 'none',
        }}>
          {tooltip}
        </div>
      )}

      {/* Page number indicator */}
      <div style={{
        position: 'absolute', left: 6, top: 6, zIndex: 1,
        background: changed ? 'var(--brand-800)' : 'var(--ink-900)',
        color: '#fff', width: 18, height: 18, borderRadius: 9,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700,
      }}>{page}</div>
    </div>
  );
};
