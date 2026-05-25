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
  const rows = timelineRows.slice(0, 12);
  const completed = timelineRows.filter((row) => row.status === 'done').length;
  const needsReview = timelineRows.filter((row) => row.status === 'needs-review').length;

  return (
    <footer className="fix-runtime-scrubber" aria-label="修复时间线">
      <div className="fix-runtime-scrubber-meta">
        <span className="chip rust">红笔时间线</span>
        <strong>{completed} 项已写回</strong>
        <span>{needsReview} 项待确认 · {runtimeStore.progressPct}%</span>
      </div>
      <div className="fix-runtime-scrubber-track">
        {rows.map((row, index) => (
          <button
            type="button"
            key={row.id}
            className={[
              'fix-runtime-scrubber-node',
              row.status === 'live' ? 'is-live' : '',
              row.status === 'done' ? 'is-done' : '',
              row.status === 'needs-review' ? 'is-review' : '',
            ].filter(Boolean).join(' ')}
            onClick={() => onJumpToAction(row)}
            title={`${row.findingTitle} · 第 ${row.page} 页`}
          >
            <i />
            <span>{index + 1}</span>
          </button>
        ))}
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
