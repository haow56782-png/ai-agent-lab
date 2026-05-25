// Step4DiffWorkbench — three-pane review surface OR card-based change list.
// Default view is the student-friendly ChangeListView (变更清单).
// Switch to 文档对比 for the Before/After double-pane diff.

import { useState } from 'react';
import { Canvas } from '../../components/review-workbench/Canvas';
import { FindingPane } from '../../components/review-workbench/FindingPane';
import { RulePane } from '../../components/review-workbench/RulePane';
import { ChangeListView } from '../../components/ChangeListView';
import { reviewActions } from '../../stores/reviewStore';
import type { Finding } from '../../stores/reviewStore';
import type { DiffCopyShape } from './diffCopy';
import type { PaperPage } from './types';
import type { ContentIntegrityView } from '../../utils/contentIntegrityView';

interface Step4DiffWorkbenchProps {
  copy: DiffCopyShape;
  contentIntegrity: ContentIntegrityView;
  findings: Finding[];
  isAllAccepted: boolean;
  paperBow: boolean;
  paperHeader: string;
  paperPages: PaperPage[];
  paperTitle: string;
  onAccept: (finding: Finding) => void;
  onMissingFinding: (message: string) => void;
  onReject: (finding: Finding) => void;
  onSelfEdit: (finding: Finding) => void;
}

export function Step4DiffWorkbench({
  copy,
  contentIntegrity,
  findings,
  isAllAccepted,
  paperBow,
  paperHeader,
  paperPages,
  paperTitle,
  onAccept,
  onMissingFinding,
  onReject,
  onSelfEdit,
}: Step4DiffWorkbenchProps) {
  // View toggle: default to student-friendly change list (变更清单)
  const [activeView, setActiveView] = useState<'change-list' | 'diff'>('change-list');
  const pendingCount = findings.filter((finding) => finding.status === 'pending').length;
  const acceptedCount = findings.filter((finding) => finding.status === 'accepted').length;
  const rejectedCount = findings.filter((finding) => finding.status === 'rejected').length;

  const handleViewOriginal = (findingId: string) => {
    setActiveView('diff');
    // Defer focus so the DOM has time to render the diff view
    window.setTimeout(() => {
      reviewActions.setFocus(findingId, 'pane');
    }, 100);
  };

  return (
    <section
      className="proof-desk-shell"
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* View toggle bar */}
      <div className="proof-desk-subbar">
        <div className="proof-desk-title">
          <span className="chip brand">校对台</span>
          <strong>逐项校对</strong>
          <span>{acceptedCount} 已批准 · {pendingCount} 待确认 · {rejectedCount} 存疑</span>
        </div>
        <div className="proof-desk-toggle" role="group" aria-label="校对视图">
          <button
            type="button"
            className={activeView === 'change-list' ? 'is-active' : ''}
            onClick={() => setActiveView('change-list')}
          >
            变更清单
          </button>
          <button
            type="button"
            className={activeView === 'diff' ? 'is-active' : ''}
            onClick={() => setActiveView('diff')}
          >
            文档对比
          </button>
        </div>
      </div>

      {/* Active view */}
      {activeView === 'change-list' ? (
        <div className="proof-desk-main">
          <ChangeListView
            copy={copy}
            findings={findings}
            onViewOriginal={handleViewOriginal}
          />
          <aside className="proof-desk-certificate">
            <div className="proof-cert-kicker">CONTENT INTEGRITY</div>
            <h3>{contentIntegrity.icon} {contentIntegrity.title}</h3>
            <p>{contentIntegrity.detail}</p>
            <div className="proof-cert-hash">
              <span>原稿 sha256</span>
              <b>{contentIntegrity.status === 'verified' ? 'MATCH' : 'WAIT'}</b>
              <code>a4e8...6f2c9b21d8</code>
              <span>新稿 sha256</span>
              <b>{contentIntegrity.status === 'verified' ? 'MATCH' : 'WAIT'}</b>
              <code>a4e8...6f2c9b21d8</code>
            </div>
            <div className="proof-cert-metrics">
              <div><strong>{findings.length}</strong><span>发现项</span></div>
              <div><strong>{acceptedCount}</strong><span>已批准</span></div>
              <div><strong>{pendingCount}</strong><span>待确认</span></div>
              <div><strong>{isAllAccepted ? '开放' : '守门'}</strong><span>下载状态</span></div>
            </div>
            <div className="proof-cert-scope">
              {['段落格式', '字符样式', '分节属性', '页码域', 'TOC 域', '题注'].map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
            <div className="proof-cert-deny">
              {['正文文字', '脚注内容', '引用条目', '图片像素'].map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </aside>
        </div>
      ) : (
        <div
          className="proof-desk-diff-grid"
          style={{
            flex: 1,
            minHeight: 0,
            display: 'grid',
            gridTemplateColumns: '280px minmax(0, 1fr) 400px',
            gap: 0,
            overflow: 'hidden',
          }}
        >
          <RulePane
            findings={findings}
            onMissingFinding={onMissingFinding}
          />

          <Canvas
            pages={paperPages}
            findings={findings}
            paperBow={paperBow}
            isAllAccepted={isAllAccepted}
            paperHeader={paperHeader}
            paperTitle={paperTitle}
            copy={copy}
          />

          <FindingPane
            copy={copy}
            findings={findings}
            onAccept={onAccept}
            onReject={onReject}
            onSelfEdit={onSelfEdit}
          />
        </div>
      )}
    </section>
  );
}
