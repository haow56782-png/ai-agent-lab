import React, { useState } from 'react';
import type { TimelineRow, FixRuntimeStore } from './types';

interface Props {
  runtimeStore: FixRuntimeStore;
  appliedCount: number;
  fixActionsLength: number;
  timelineRows: TimelineRow[];
  viewDiffEnabled: boolean;
  diffPulse: boolean;
  rightFeedRef: React.RefObject<HTMLDivElement | null>;
  onScroll: (event: React.UIEvent<HTMLDivElement>) => void;
  onJumpToAction: (row: TimelineRow) => void;
  onViewDiff: () => void;
}

export const FixRuntimeActionFeed: React.FC<Props> = ({
  runtimeStore,
  appliedCount,
  fixActionsLength,
  timelineRows,
  viewDiffEnabled,
  diffPulse,
  rightFeedRef,
  onScroll,
  onJumpToAction,
  onViewDiff,
}) => {
  const [focusedRowId, setFocusedRowId] = useState<string | null>(null);

  const jumpAndFrameCard = (row: TimelineRow, node: HTMLElement) => {
    setFocusedRowId(row.id);
    onJumpToAction(row);
    const frameNode = () => {
      const feedNode = rightFeedRef.current;
      if (!feedNode) return;
      const currentNode = feedNode.querySelector<HTMLElement>(`[data-testid="fix-runtime-action-card-${row.id}"]`) || node;
      const targetTop = Math.max(0, currentNode.offsetTop - 96);
      feedNode.scrollTo({ top: targetTop, behavior: 'auto' });
    };
    window.requestAnimationFrame(frameNode);
    window.setTimeout(frameNode, 120);
  };

  return (
    <aside
      className="fix-runtime-note fix-runtime-note-right"
      ref={rightFeedRef}
      onScroll={onScroll}
      data-testid="fix-runtime-action-feed"
    >
      <div className="fix-runtime-note-head" data-testid="fix-runtime-action-count">发现项修复 {Math.min(appliedCount, fixActionsLength)}/{fixActionsLength || runtimeStore.totalItems}</div>
      <div className="fix-runtime-note-stack">
        {timelineRows.map((row) => (
          <article
            key={row.id}
            data-testid={`fix-runtime-action-card-${row.id}`}
            data-finding-id={row.findingId}
            data-page-number={row.page}
            className={[
              'fix-runtime-action-card',
              row.status === 'live' ? 'is-live' : '',
              row.status === 'needs-review' ? 'is-needs-review' : '',
              focusedRowId === row.id ? 'is-user-focus' : '',
            ].filter(Boolean).join(' ')}
            onClick={(event) => jumpAndFrameCard(row, event.currentTarget)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); jumpAndFrameCard(row, e.currentTarget); } }}
            role="button"
            tabIndex={0}
            aria-label={`跳转到发现项 ${row.findingLabel}，动作：${row.before}`}
          >
            <div className="fix-runtime-action-meta">
              <span>{row.timestamp}</span>
              <span className="fix-runtime-action-anchor">证据 · {row.chapter}</span>
            </div>
            <div className="fix-runtime-action-finding">{row.findingLabel}</div>
            <div className="fix-runtime-action-before">
              <span className={row.status === 'live' ? 'fix-runtime-action-dot is-live' : row.status === 'needs-review' ? 'fix-runtime-action-dot is-needs-review' : 'fix-runtime-action-dot is-done'} />
              {row.before}
            </div>
            <div className="fix-runtime-action-after">{row.after}</div>
            <div className="fix-runtime-action-rule">{row.ruleLabel}</div>
          </article>
        ))}
      </div>

      <div className="fix-runtime-bottom-meta" style={{ padding: '12px 0 4px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className={`fix-runtime-status-dot status-${runtimeStore.status}`} />
        <span>已修复 {runtimeStore.fixedItems}/{runtimeStore.totalItems} 项</span>
      </div>

      <button
        type="button"
        className={viewDiffEnabled ? `fix-runtime-diff-btn is-active ${diffPulse ? 'is-pulsing' : ''}` : 'fix-runtime-diff-btn'}
        onClick={onViewDiff}
        disabled={!viewDiffEnabled}
        title={!viewDiffEnabled ? '修复完成后进入人工确认' : undefined}
      >
        进入人工确认
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
    </aside>
  );
};
