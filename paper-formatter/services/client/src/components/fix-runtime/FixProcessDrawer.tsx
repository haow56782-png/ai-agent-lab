import React from 'react';
import type { FixTaskFilter, TimelineRow } from './types';

interface Props {
  rows: TimelineRow[];
  activeFilter: FixTaskFilter;
  open: boolean;
  onClose: () => void;
  onJumpToRow: (row: TimelineRow, node: HTMLElement) => void;
  focusedRowId?: string | null;
}

const FILTER_TITLE: Record<FixTaskFilter, string> = {
  all: '完整修复过程',
  written: '已修复项',
  review: '待确认项',
  manual: '未处理项',
};

export const FixProcessDrawer: React.FC<Props> = ({
  rows,
  activeFilter,
  open,
  onJumpToRow,
  focusedRowId,
}) => {
  if (!open) return null;

  return (
    <div className="fix-process-inline" data-testid="fix-process-drawer">
      <div className="fix-process-inline-head">
        <strong>{FILTER_TITLE[activeFilter]}</strong>
        <span>{rows.length} 项</span>
      </div>
      <div className="fix-process-inline-list">
        {rows.length === 0 ? (
          <div className="fix-process-empty">当前分类暂无发现项。</div>
        ) : rows.map((row, index) => {
          const tone = row.status === 'live' ? 'live' : row.status === 'needs-review' ? 'waiting' : 'done';
          return (
            <button
              key={row.id}
              type="button"
              className={[
                'fix-process-row',
                'fix-runtime-action-card',
                `status-${tone}`,
                row.status === 'live' ? 'is-live' : '',
                row.status === 'needs-review' ? 'is-needs-review' : '',
                focusedRowId === row.id ? 'is-user-focus' : '',
              ].filter(Boolean).join(' ')}
              data-testid={`fix-runtime-action-card-${row.id}`}
              data-page-number={row.page}
              data-finding-id={row.findingId}
              onClick={(event) => onJumpToRow(row, event.currentTarget)}
            >
              <span className="fix-process-index">{index + 1}</span>
              <span className="fix-process-main">
                <strong>{row.findingTitle}</strong>
                <em>第 {row.page} 页 · {row.chapter}</em>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
