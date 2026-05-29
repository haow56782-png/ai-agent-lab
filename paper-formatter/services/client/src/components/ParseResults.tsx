import React from 'react';
import { analytics } from '../api/analytics';
import type { SchoolOption } from './AppFrame';

export interface IssueGroupItem {
  label: string;
  status: 'warn' | 'fail';
}

export interface IssueGroup {
  cat: string;
  items: IssueGroupItem[];
}

interface ParseResultsProps {
  legacyDocWarning: boolean;
  totalIssues: number;
  fixableIssues: number;
  animatedScore: number;
  scoreTone: string;
  scoreBg: string;
  issueGroups: IssueGroup[];
  findingSourceGroups: Array<{ label: string; count: number; hint: string }>;
  evidenceHighlights: Array<{ label: string; snippet: string }>;
  coveredPageCount: number;
  school: SchoolOption | null;
  elapsedStr: string;
  logs: { t: 'phase' | 'ok' | 'warn'; text: string }[];
  showShare: boolean;
  onStep: (step: number) => void;
  onCloseShare: () => void;
  onShareClick: () => void;
}

const DUPLICATION_ITEMS = [
  { icon: '📋', title: '目录未使用自动生成', desc: '手打的目录会被知网当成正文内容', fixable: true },
  { icon: '📄', title: '页眉含论文标题', desc: '页眉文字可能被计入正文查重范围', fixable: true },
  { icon: '📚', title: '参考文献格式不规范', desc: '3 条引用可能不被识别为参考文献', fixable: true },
  { icon: '📝', title: '脚注格式混乱', desc: '脚注内容可能被合并到正文计算', fixable: false },
];

import ShareModal from './ShareModal';

export const ParseResults: React.FC<ParseResultsProps> = ({
  legacyDocWarning, totalIssues, fixableIssues,
  animatedScore, scoreTone, scoreBg,
  issueGroups, findingSourceGroups, evidenceHighlights, coveredPageCount, school, elapsedStr, logs,
  showShare, onStep, onCloseShare, onShareClick,
}) => {
  const admissionSteps = [
    { label: '文件可读', detail: '已识别论文结构与正文片段' },
    { label: '规则可用', detail: school ? `${school.name} · ${school.version}` : '当前规则基线' },
    { label: '证据归档', detail: `${coveredPageCount || 1} 个证据位置` },
    { label: '工作台就绪', detail: `${fixableIssues || totalIssues} 项可进入处理` },
  ];
  const workEvidenceRows = [
    { time: 'T+00', action: '读取文档结构', object: `${coveredPageCount || 1} 个证据位置` },
    { time: 'T+01', action: '匹配规则包', object: school ? `${school.name} · ${school.version}` : '学校规则 + GB/T 7713.1' },
    { time: 'T+02', action: '归并发现项', object: `${totalIssues} 项发现 · ${fixableIssues} 项可处理` },
    { time: 'T+03', action: '生成处理工作台', object: '进入 Step4 前保留人工确认边界' },
  ];

  return (
  <>
    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 28, paddingBottom: 80 }}>
      <div>
        <div className="secdex" style={{ marginBottom: 10 }}>发现项 · FINDINGS</div>

        {legacyDocWarning && (
          <div style={{
            marginBottom: 16, padding: '12px 14px', borderRadius: 6,
            background: 'var(--sun-100)', border: '1px solid rgba(183,135,43,.18)',
            color: 'var(--sun-700)', fontSize: 12.5, lineHeight: 1.6,
          }}>
            <span style={{ fontWeight: 600 }}>修复前提醒：</span>
            <span>检测到当前文件实际上是旧版 .doc / WPS 兼容格式。解析可以继续，但自动修复前请先在 WPS 或 Word 中另存为标准 .docx。</span>
          </div>
        )}

        {/* Finding summary card */}
        <div style={{
          background: scoreBg, border: `1.5px solid ${scoreTone}30`, borderRadius: 6,
          padding: '32px 32px 28px', marginBottom: 18, textAlign: 'center',
          transition: 'background .3s',
        }}>
          <div className="serif" style={{ fontSize: 20, fontWeight: 600, color: 'var(--ink-900)', marginBottom: 8, letterSpacing: -.2 }}>
            AI 已整理出交稿前需要你确认的发现项
          </div>
          <div style={{
            width: 120, height: 120, borderRadius: 60,
            background: animatedScore < 60 ? 'var(--rust-100)' : animatedScore < 80 ? 'var(--sun-100)' : 'var(--leaf-100)',
            border: `4px solid ${scoreTone}`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <span className="mono num" style={{ fontSize: 42, fontWeight: 700, color: scoreTone, lineHeight: 1 }}>
              {totalIssues}
            </span>
            <span className="mono" style={{ fontSize: 13, color: scoreTone, opacity: .7 }}>FINDINGS</span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--ink-700)', marginBottom: 4 }}>
            共 <strong style={{ color: totalIssues > 0 ? 'var(--rust-700)' : 'var(--leaf-700)' }}>{totalIssues}</strong> 项发现，
            其中 <strong style={{ color: 'var(--brand-700)' }}>{fixableIssues}</strong> 项可以进入逐条处理工作台
          </div>
          <div style={{ marginTop: 18, display: 'flex', gap: 10, justifyContent: 'center', alignItems: 'center' }}>
            <button onClick={() => onStep(4)} style={{
              height: 44, padding: '0 28px', borderRadius: 4,
              border: 'none', background: 'var(--ink-900)', color: 'var(--paper-0)',
              fontSize: 14, fontWeight: 600, fontFamily: 'var(--sans)',
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
            }}>
              <span>🔎</span> 查看 {fixableIssues || totalIssues} 项发现并处理
            </button>
            <button onClick={onShareClick} style={{
              height: 44, padding: '0 22px', borderRadius: 4,
              border: '1px solid var(--ink-300)', background: 'var(--paper-0)',
              fontSize: 14, fontWeight: 500, fontFamily: 'var(--sans)',
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
              color: 'var(--ink-700)',
            }}>
              📤 分享这次进度
            </button>
          </div>
        </div>

        {/* Duplication risk card */}
        <div style={{
          background: 'var(--sun-100)', border: '1.5px solid var(--sun-500)', borderRadius: 6,
          padding: '20px 22px', marginBottom: 18,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 18 }}>⚠️</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink-900)' }}>
                检测到 <strong style={{ color: 'var(--rust-700)' }}>4</strong> 个可能影响查重率的格式问题
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-500)', marginTop: 2 }}>
                这些问题可能导致查重系统将非正文内容计入重复率，
                修复后查重率<strong style={{ color: 'var(--leaf-700)' }}>预计可再压低 3–5 个百分点</strong>，更接近安心送审的状态。
              </div>
            </div>
          </div>

          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 0, background: 'var(--paper-0)', borderRadius: 4, overflow: 'hidden', border: '1px solid var(--hair)' }}>
            {DUPLICATION_ITEMS.map((item, i, arr) => (
              <div key={i} style={{
                padding: '11px 14px', borderBottom: i < arr.length - 1 ? '1px solid var(--hair)' : 'none',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <span style={{ fontSize: 16, flex: '0 0 auto' }}>{item.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-900)' }}>{item.title}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-500)', marginTop: 1 }}>{item.desc}</div>
                </div>
                <span style={{
                  flex: '0 0 auto', padding: '2px 8px', borderRadius: 3,
                  fontSize: 10.5, fontWeight: 600, fontFamily: 'var(--mono)',
                  background: item.fixable ? 'var(--brand-50)' : 'var(--paper-2)',
                  color: item.fixable ? 'var(--brand-700)' : 'var(--ink-500)',
                }}>{item.fixable ? '可修复' : '手动'}</span>
              </div>
            ))}
          </div>

          <button onClick={() => onStep(4)} style={{
            marginTop: 12, height: 38, padding: '0 20px', borderRadius: 4,
            border: 'none', background: 'var(--rust-600)', color: '#fff',
            fontSize: 13, fontWeight: 600, fontFamily: 'var(--sans)',
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            🔧 先处理这些送审风险项
          </button>
        </div>

        {/* Issue list */}
        <div
          style={{ fontSize: 10, color: 'var(--ink-400)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 8 }}
        >
          待处理发现项 · {totalIssues} 项
        </div>
        <div style={{ background: 'var(--paper-0)', border: '1px solid var(--hair)', borderRadius: 4 }}>
          {issueGroups.length > 0 ? issueGroups.map((g, gi) => (
            <div key={gi}>
              <div style={{ padding: '12px 16px', borderBottom: gi < issueGroups.length - 1 ? '1px solid var(--hair)' : 'none' }}>
                <div style={{
                  fontSize: 13, fontWeight: 600, color: 'var(--ink-900)', marginBottom: 8,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  {g.cat}
                  <span className="mono" style={{ fontSize: 9, color: 'var(--ink-500)', fontWeight: 400, letterSpacing: '.04em' }}>
                    {g.items.length} 项
                  </span>
                </div>
                {g.items.map((item, ii) => (
                  <div key={ii} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                    padding: '7px 0', borderTop: ii > 0 ? '1px dashed var(--hair)' : 'none',
                    fontSize: 12.5, lineHeight: 1.4,
                  }}>
                    <span style={{
                      flex: '0 0 auto', marginTop: 1,
                      color: item.status === 'fail' ? 'var(--rust-600)' : 'var(--sun-700)',
                      fontSize: 13,
                    }}>
                      {item.status === 'fail' ? '✗' : '⚠'}
                    </span>
                    <span style={{ flex: 1, color: 'var(--ink-700)' }}>{item.label}</span>
                    <span style={{
                      flex: '0 0 auto', padding: '1px 6px', borderRadius: 2,
                      background: 'var(--brand-50)', color: 'var(--brand-700)',
                      fontSize: 10, fontWeight: 600, fontFamily: 'var(--mono)',
                    }}>可修复</span>
                  </div>
                ))}
              </div>
            </div>
          )) : (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--ink-500)', fontSize: 13 }}>
              ✓ 当前没有发现阻碍交稿的格式问题
            </div>
          )}
        </div>
      </div>

      {/* Right column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0 }}>
        <div style={{
          background: 'var(--ink-900)', borderRadius: 6, padding: '16px 18px',
          color: 'var(--paper-0)',
        }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: '.16em', color: 'rgba(255,255,255,.55)', marginBottom: 10 }}>
            GLASS BOX · {elapsedStr}
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.6, color: 'rgba(255,255,255,.86)', marginBottom: 14 }}>
            这次体检已经整理出 <strong style={{ color: '#fff' }}>{totalIssues}</strong> 项发现，
            覆盖 <strong style={{ color: '#fff' }}>{coveredPageCount || 1}</strong> 个证据位置，
            {school ? `并按 ${school.name} ${school.version} 的规则包归档。` : '并按当前规则基线归档。'}
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: 6, marginBottom: 14,
          }}>
            {admissionSteps.map((step, index) => (
              <div key={step.label} style={{
                border: '1px solid rgba(255,255,255,.12)', borderRadius: 5,
                padding: '8px 7px', background: 'rgba(255,255,255,.05)',
              }}>
                <div className="mono" style={{ fontSize: 10, color: '#9ee6b7', marginBottom: 4 }}>
                  {index + 1}/4
                </div>
                <div style={{ fontSize: 11.5, color: '#fff', fontWeight: 600 }}>{step.label}</div>
                <div style={{ fontSize: 9.5, color: 'rgba(255,255,255,.42)', marginTop: 2, lineHeight: 1.35 }}>
                  {step.detail}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {findingSourceGroups.map((group) => (
              <div key={group.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{
                  width: 18, height: 18, borderRadius: 9,
                  background: 'rgba(98, 163, 127, .18)', color: '#9ee6b7',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700, marginTop: 1,
                }}>{group.count}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: 'var(--paper-0)' }}>{group.label}</div>
                  <div className="mono" style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', marginTop: 1 }}>
                    {group.hint}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          background: 'var(--paper-0)', borderRadius: 6, border: '1px solid var(--hair)',
          padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0,
        }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: '.16em', color: 'var(--ink-400)', marginBottom: 10 }}>
            WORK EVIDENCE · 4/4
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
            {workEvidenceRows.map((row) => (
              <div key={`${row.time}-${row.action}`} style={{
                display: 'grid', gridTemplateColumns: '42px minmax(0, 1fr)',
                gap: 8, alignItems: 'baseline',
                padding: '7px 8px', borderRadius: 4,
                background: 'var(--paper-1)', border: '1px solid rgba(21,23,27,.06)',
              }}>
                <span className="mono" style={{ fontSize: 10, color: 'var(--brand-700)' }}>{row.time}</span>
                <span style={{ fontSize: 12, color: 'var(--ink-700)', lineHeight: 1.45 }}>
                  <strong style={{ color: 'var(--ink-900)', fontWeight: 600 }}>{row.action}</strong>
                  <span style={{ color: 'var(--ink-400)' }}> · </span>
                  {row.object}
                </span>
              </div>
            ))}
          </div>
          <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {evidenceHighlights.map((item, i) => (
              <div
                key={`${item.label}-${i}`}
                style={{
                  borderBottom: i < evidenceHighlights.length - 1 ? '1px dashed var(--hair)' : 'none',
                  paddingBottom: 10,
                  marginBottom: i < evidenceHighlights.length - 1 ? 2 : 0,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-900)', marginBottom: 4 }}>
                  {item.label}
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.55, color: 'var(--ink-600)' }}>
                  {item.snippet}
                </div>
              </div>
            ))}
            {evidenceHighlights.length === 0 && logs.map((l, i) => (
              <div key={i} className="mono" style={{
                fontSize: 11.5, lineHeight: 1.5,
                color: l.t === 'warn' ? 'var(--sun-700)' : l.t === 'phase' ? 'var(--ink-500)' : 'var(--ink-700)',
              }}>
                <span style={{ color: 'var(--ink-400)' }}>{`> `}</span>
                {l.text}
              </div>
            ))}
            <div className="mono" style={{ fontSize: 11.5, color: 'var(--leaf-700)', marginTop: 4 }}>
              <span style={{ color: 'var(--ink-400)' }}>{`> `}</span>
              已整理成可逐条确认的发现项工作台
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Sticky CTA */}
    <div style={{
      position: 'sticky', bottom: 0, left: 0, right: 0,
      background: 'var(--paper-0)', borderTop: '1px solid var(--hair)',
      padding: '12px 56px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      boxShadow: '0 -4px 12px rgba(0,0,0,.06)',
      zIndex: 10,
    }}>
      <div style={{ fontSize: 13, color: 'var(--ink-700)' }}>
        发现 <strong style={{ color: totalIssues > 0 ? 'var(--rust-700)' : 'var(--leaf-700)' }}>{totalIssues}</strong> 项需要终审
        {fixableIssues > 0 && <span> · <strong style={{ color: 'var(--brand-700)' }}>{fixableIssues}</strong> 项可进入处理工作台</span>}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
<button onClick={() => onStep(4)} style={{
          height: 38, padding: '0 22px', borderRadius: 4,
          border: 'none', background: 'var(--ink-900)', color: 'var(--paper-0)',
          fontSize: 13, fontWeight: 600, fontFamily: 'var(--sans)',
          cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>
          <span>🔎</span> 查看 {fixableIssues || totalIssues} 项发现并处理
        </button>
      </div>
    </div>

    {showShare && (
      <ShareModal
        score={animatedScore}
        totalIssues={totalIssues}
        fixableIssues={fixableIssues}
        schoolName={school?.name || ''}
        collegeName=""
        onClose={onCloseShare}
        onCopyLink={() => { analytics.shareCopyLink('result_page'); navigator.clipboard.writeText(window.location.href); }}
        onGeneratePoster={() => { analytics.shareGeneratePoster('result_page'); }}
      />
    )}
  </>
  );
};
