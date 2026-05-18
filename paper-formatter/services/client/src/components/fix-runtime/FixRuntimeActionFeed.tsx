import React, { useEffect, useRef, useState } from 'react';
import { FixBeforeAfterModal } from './FixBeforeAfterModal';
import { FixProcessDrawer } from './FixProcessDrawer';
import type { TimelineRow, FixRuntimeStore, FixFindingStatusSummary, FixTaskFilter } from './types';

interface Props {
  runtimeStore: FixRuntimeStore;
  findingStatusSummary: FixFindingStatusSummary;
  timelineRows: TimelineRow[];
  viewDiffEnabled: boolean;
  diffPulse: boolean;
  rightFeedRef: React.RefObject<HTMLDivElement | null>;
  onScroll: (event: React.UIEvent<HTMLDivElement>) => void;
  onJumpToAction: (row: TimelineRow) => void;
  onViewDiff: () => void;
}

export const FixRuntimeActionFeed: React.FC<Props> = ({
  findingStatusSummary,
  timelineRows,
  viewDiffEnabled,
  diffPulse,
  rightFeedRef,
  onScroll,
  onJumpToAction,
  onViewDiff,
}) => {
  const [compareRow, setCompareRow] = useState<TimelineRow | null>(null);
  const [activeFilter, setActiveFilter] = useState<FixTaskFilter>('all');
  const [focusedRowId, setFocusedRowId] = useState<string | null>(null);
  const focusTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (focusTimerRef.current !== null) clearTimeout(focusTimerRef.current);
    };
  }, []);

  const clearFocusHighlight = () => {
    if (focusTimerRef.current !== null) {
      clearTimeout(focusTimerRef.current);
      focusTimerRef.current = null;
    }
    setFocusedRowId(null);
  };

  const jumpAndFrameCard = (row: TimelineRow, node: HTMLElement) => {
    clearFocusHighlight();

    setFocusedRowId(row.id);
    focusTimerRef.current = window.setTimeout(() => {
      setFocusedRowId(null);
      focusTimerRef.current = null;
    }, 2000);

    onJumpToAction(row);
    requestAnimationFrame(() => {
      const feedNode = rightFeedRef.current;
      if (!feedNode) return;
      const currentNode = feedNode.querySelector<HTMLElement>(`[data-testid="fix-runtime-action-card-${row.id}"]`) || node;
      const targetTop = Math.max(0, currentNode.offsetTop - 96);
      feedNode.scrollTo({ top: targetTop, behavior: 'auto' });
    });
  };

  const filteredRows = timelineRows.filter((row) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'written') return row.status === 'done' || row.status === 'live';
    if (activeFilter === 'review') return row.status === 'needs-review';
    return false;
  });
  const compareCandidate = filteredRows.find((row) => row.status === 'live')
    || filteredRows.find((row) => row.status === 'done')
    || filteredRows[0]
    || null;
  const locateCompareCandidate = () => {
    if (!compareCandidate) return;
    const node = rightFeedRef.current?.querySelector<HTMLElement>(`[data-testid="fix-runtime-action-card-${compareCandidate.id}"]`);
    jumpAndFrameCard(compareCandidate, node || rightFeedRef.current || document.body);
  };

  const ctaCopy = (() => {
    if (!viewDiffEnabled) {
      return {
        label: `写回中 · ${findingStatusSummary.writtenBack}/${findingStatusSummary.autoFixableTotal}`,
        title: '修复写回完成后进入人工确认',
      };
    }
    if (findingStatusSummary.notAutoFixed > 0) {
      return {
        label: `进入人工确认 · ${findingStatusSummary.notAutoFixed} 项需手动复核`,
        title: `已写回 ${findingStatusSummary.writtenBack}/${findingStatusSummary.autoFixableTotal} 项，另有 ${findingStatusSummary.notAutoFixed} 项未自动修复`,
      };
    }
    return {
      label: `进入人工确认 · ${findingStatusSummary.writtenBack} 项已写回`,
      title: '所有可自动修复的发现项已写回，进入人工确认逐项过目',
    };
  })();

  return (
    <aside
      className="fix-runtime-panel fix-runtime-panel-task fix-runtime-note fix-runtime-note-right"
      ref={rightFeedRef}
      onScroll={onScroll}
      data-testid="fix-runtime-action-feed"
    >
      <div className="fix-runtime-note-head" data-testid="fix-runtime-action-count">
        完整修复过程 · 当前修复现场
      </div>

      <FixProcessDrawer
        rows={filteredRows}
        activeFilter={activeFilter}
        open={true}
        onClose={() => {}}
        onJumpToRow={jumpAndFrameCard}
        focusedRowId={focusedRowId}
      />

      <div className="fix-runtime-process-actions">
        <button
          type="button"
          className="fix-runtime-compare-current"
          onClick={() => compareCandidate && setCompareRow(compareCandidate)}
          disabled={!compareCandidate}
        >
          查看修复前后对比
        </button>
        <button
          type="button"
          className="fix-runtime-locate-current"
          onClick={locateCompareCandidate}
          disabled={!compareCandidate}
        >
          定位到文档位置
        </button>
        <button
          type="button"
          className="fix-runtime-process-filter"
          onClick={() => setActiveFilter(activeFilter === 'all' ? 'review' : 'all')}
        >
          {activeFilter === 'all' ? `只看待确认 ${findingStatusSummary.needsReview}` : '查看全部过程'}
        </button>
      </div>

      <button
        type="button"
        className={viewDiffEnabled ? `fix-runtime-diff-btn is-active ${diffPulse ? 'is-pulsing' : ''}` : 'fix-runtime-diff-btn'}
        onClick={onViewDiff}
        disabled={!viewDiffEnabled}
        title={ctaCopy.title}
      >
        {ctaCopy.label}
      </button>

      <div className="fix-runtime-scroll-top">
        <button
          type="button"
          className="fix-runtime-scroll-top-btn"
          onClick={() => {
            const note = rightFeedRef.current;
            if (note) note.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          aria-label="回到顶部"
        >
          ↑
        </button>
      </div>

      <FixBeforeAfterModal row={compareRow} onClose={() => setCompareRow(null)} />
    </aside>
  );
};
