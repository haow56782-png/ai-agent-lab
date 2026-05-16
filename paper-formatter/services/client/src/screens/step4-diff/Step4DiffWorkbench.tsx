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

interface Step4DiffWorkbenchProps {
  copy: DiffCopyShape;
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

  const handleViewOriginal = (findingId: string) => {
    setActiveView('diff');
    // Defer focus so the DOM has time to render the diff view
    window.setTimeout(() => {
      reviewActions.setFocus(findingId, 'pane');
    }, 100);
  };

  return (
    <section
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* View toggle bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0,
        padding: '6px 0',
        borderBottom: '1px solid var(--border-light)',
        background: 'var(--bg-surface)',
      }}>
        <button
          type="button"
          onClick={() => setActiveView('change-list')}
          style={{
            padding: '6px 20px',
            fontSize: 13,
            fontWeight: activeView === 'change-list' ? 600 : 400,
            color: activeView === 'change-list' ? 'var(--brand)' : 'var(--text-secondary)',
            background: activeView === 'change-list' ? 'var(--brand-bg)' : 'transparent',
            border: 'none',
            borderRadius: '6px 0 0 6px',
            cursor: 'pointer',
            transition: 'all 150ms',
          }}
        >
          📋 变更清单
        </button>
        <button
          type="button"
          onClick={() => setActiveView('diff')}
          style={{
            padding: '6px 20px',
            fontSize: 13,
            fontWeight: activeView === 'diff' ? 600 : 400,
            color: activeView === 'diff' ? 'var(--brand)' : 'var(--text-secondary)',
            background: activeView === 'diff' ? 'var(--brand-bg)' : 'transparent',
            border: 'none',
            borderRadius: '0 6px 6px 0',
            cursor: 'pointer',
            transition: 'all 150ms',
          }}
        >
          📄 文档对比
        </button>
      </div>

      {/* Active view */}
      {activeView === 'change-list' ? (
        <ChangeListView
          copy={copy}
          findings={findings}
          onViewOriginal={handleViewOriginal}
        />
      ) : (
        <div
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
