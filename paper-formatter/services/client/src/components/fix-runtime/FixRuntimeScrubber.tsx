import React from 'react';
import type { FixRuntimeStore, TimelineRow } from './types';

interface Props {
  runtimeStore: FixRuntimeStore;
  timelineRows: TimelineRow[];
  viewDiffEnabled: boolean;
  onJumpToAction: (row: TimelineRow) => void;
  onViewDiff: () => void;
}

export const FixRuntimeScrubber: React.FC<Props> = ({
  runtimeStore,
  timelineRows,
  viewDiffEnabled,
  onJumpToAction,
  onViewDiff,
}) => {
  const totalSteps = Math.max(1, runtimeStore.totalItems, timelineRows.length);
  const completedSteps = Math.min(totalSteps, Math.max(0, runtimeStore.fixedItems));
  const progressPercent = Math.round((completedSteps / totalSteps) * 100);
  const stepSlots = Array.from({ length: Math.min(totalSteps, 12) }, (_, index) => ({
    index,
    row: timelineRows[index] || null,
  }));
  const needsReview = timelineRows.filter((row) => row.status === 'needs-review').length;

  return (
    <footer className="fix-runtime-scrubber" aria-label="修复时间线">
      <div className="fix-runtime-scrubber-meta">
        <span className="chip rust">修复步骤</span>
        <strong>{completedSteps} / {totalSteps}</strong>
        <span>{needsReview} 项待确认 · {progressPercent}%</span>
      </div>
      <div className="fix-runtime-scrubber-track-wrap">
        <div
          className="fix-runtime-scrubber-progress"
          role="progressbar"
          aria-label="修复步骤进度"
          aria-valuemin={0}
          aria-valuemax={totalSteps}
          aria-valuenow={completedSteps}
        >
          <span className="fix-runtime-scrubber-fill" style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="fix-runtime-scrubber-track">
          {stepSlots.map(({ row, index }) => {
            const isDone = index < completedSteps;
            const isLive = index === completedSteps && runtimeStore.status !== 'completed';
            const isReview = row?.status === 'needs-review';
            return (
              <button
                type="button"
                key={row?.id || `step-${index}`}
                className={[
                  'fix-runtime-scrubber-node',
                  isLive ? 'is-live' : '',
                  isDone ? 'is-done' : '',
                  isReview ? 'is-review' : '',
                  !row ? 'is-placeholder' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => row && onJumpToAction(row)}
                disabled={!row}
                title={row ? `${row.findingTitle} · 第 ${row.page} 页` : `第 ${index + 1} 项等待写回`}
                aria-label={row ? `第 ${index + 1} 项：${row.findingTitle}` : `第 ${index + 1} 项等待写回`}
              >
                <i />
                <span>{index + 1}</span>
              </button>
            );
          })}
        </div>
      </div>
      <button
        type="button"
        className={viewDiffEnabled ? 'fix-runtime-scrubber-cta is-ready' : 'fix-runtime-scrubber-cta'}
        onClick={onViewDiff}
        disabled={!viewDiffEnabled}
      >
        进入校对台
      </button>
    </footer>
  );
};
