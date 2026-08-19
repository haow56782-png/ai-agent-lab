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
  const mainChainCard = (
    <div
      className="parse-main-chain-card parse-main-chain-card-hero"
      data-testid="parse-main-chain"
      style={{ '--summary-tone': scoreTone, '--summary-bg': scoreBg } as React.CSSProperties}
    >
      <div className="parse-main-chain-head">
        <div>
          <div className="mono parse-main-chain-kicker">主链路 · STEP3 → STEP4 → STEP5</div>
          <strong>检查完成，准备进入安全写回。</strong>
          <p>交稿前需要确认的格式问题已整理完成；正文语义不会被自动改动，最终仍由你逐项确认。</p>
        </div>
        <span>{fixableIssues || totalIssues} 项可处理</span>
      </div>
      <div className="parse-main-chain-rail" aria-hidden="true">
        <i />
      </div>
      <div className="parse-main-chain-dashboard">
        <div className="parse-main-chain-stat">
          <span className="mono">发现项</span>
          <strong>{totalIssues}</strong>
          <small>{fixableIssues || totalIssues} 项进入 Step4</small>
        </div>
        <div className="parse-main-chain-stat">
          <span className="mono">证据位置</span>
          <strong>{coveredPageCount || 1}</strong>
          <small>已和规则命中归档</small>
        </div>
        <div className="parse-main-chain-stat is-boundary">
          <span className="mono">安全边界</span>
          <strong>只改格式</strong>
          <small>Step5 确认前不开放下载</small>
        </div>
      </div>
      <div className="parse-main-chain-actions">
        <button type="button" className="parse-main-chain-cta" onClick={() => onStep(4)}>
          进入 Step4 查看修改 →
        </button>
        <button type="button" className="parse-main-chain-secondary" onClick={onShareClick}>
          分享进度
        </button>
      </div>
    </div>
  );

  return (
  <>
    {mainChainCard}
    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 28, paddingBottom: 80 }}>
      <div>
        <div className="parse-section-head">
          <div>
            <span className="secdex">发现项 · FINDINGS</span>
            <strong>待处理发现项 · {totalIssues} 项</strong>
          </div>
          <small>进入 Step4 后逐项查看修改，不直接覆盖正文。</small>
        </div>

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

        {/* Issue list */}
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

        {/* Duplication risk card */}
        <div className="parse-risk-card">
          <div className="parse-risk-card-head">
            <span>!</span>
            <div>
              <strong>送审风险 · 4 个可能影响查重率的格式问题</strong>
              <small>安全写回会优先降低非正文被误计入查重的风险。</small>
            </div>
          </div>

          <div className="parse-risk-list">
            {DUPLICATION_ITEMS.map((item) => (
              <div key={item.title} className="parse-risk-item">
                <span>{item.icon}</span>
                <div>
                  <strong>{item.title}</strong>
                  <small>{item.desc}</small>
                </div>
                <b>{item.fixable ? '可修复' : '手动'}</b>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0 }}>
        <div className="parse-evidence-panel">
          <div className="parse-evidence-head">
            <span className="mono">处理证据 · {elapsedStr}</span>
            <strong>{totalIssues} 项发现已归档</strong>
            <p>
              覆盖 {coveredPageCount || 1} 个证据位置，
              {school ? `按 ${school.name} ${school.version} 规则包归档。` : '按当前规则基线归档。'}
            </p>
          </div>
          <div className="parse-evidence-gates">
            {admissionSteps.map((step, index) => (
              <div key={step.label}>
                <span className="mono">{index + 1}/4</span>
                <strong>{step.label}</strong>
                <small>{step.detail}</small>
              </div>
            ))}
          </div>
          <div className="parse-evidence-groups">
            {findingSourceGroups.map((group) => (
              <div key={group.label}>
                <span className="mono">{group.count}</span>
                <div>
                  <strong>{group.label}</strong>
                  <small>{group.hint}</small>
                </div>
              </div>
            ))}
          </div>

          <div className="parse-evidence-timeline">
            {workEvidenceRows.map((row) => (
              <div key={`${row.time}-${row.action}`}>
                <span className="mono">{row.time}</span>
                <p>
                  <strong>{row.action}</strong>
                  <i> · </i>
                  {row.object}
                </p>
              </div>
            ))}
          </div>
          <div className="parse-evidence-samples">
            {evidenceHighlights.map((item, i) => (
              <div key={`${item.label}-${i}`}>
                <strong>{item.label}</strong>
                <p>{item.snippet}</p>
              </div>
            ))}
            {evidenceHighlights.length === 0 && logs.map((l, i) => (
              <div key={i} className="mono parse-evidence-log">
                <span style={{ color: 'var(--ink-400)' }}>{`> `}</span>
                {l.text}
              </div>
            ))}
          </div>
        </div>
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
