import React from 'react';
import type { FixTaskFilter, TimelineRow } from './types';

interface Props {
  rows: TimelineRow[];
  activeFilter: FixTaskFilter;
  open: boolean;
  onClose: () => void;
  onJumpToRow: (row: TimelineRow, node: HTMLElement) => void;
}

const FILTER_TITLE: Record<FixTaskFilter, string> = {
  all: '完整修复过程',
  written: '已修复项',
  review: '待确认项',
  manual: '未处理项',
};

function rowStatusLabel(row: TimelineRow) {
  if (row.status === 'live') return '正在处理';
  if (row.status === 'needs-review') return '待确认';
  return '已写回';
}

export const FixProcessDrawer: React.FC<Props> = ({
  rows,
  activeFilter,
  open,
  onClose,
  onJumpToRow,
}) => {
  if (!open) return null;

  return (
    <div className="fix-process-drawer" data-testid="fix-process-drawer">
      <div className="fix-process-drawer-head">
        <div>
          <span className="mono">PROCESS</span>
          <strong>{FILTER_TITLE[activeFilter]}</strong>
        </div>
        <button type="button" onClick={onClose} aria-label="收起修复过程">收起</button>
      </div>
      <div className="fix-process-drawer-list">
        {rows.length === 0 ? (
          <div className="fix-process-empty">当前分类暂无发现项，完整结果会在确认页统一复核。</div>
        ) : rows.map((row, index) => (
          <button
            key={row.id}
            type="button"
            className="fix-process-row"
            onClick={(event) => onJumpToRow(row, event.currentTarget)}
          >
            <span className="fix-process-index">{index + 1}</span>
            <span className="fix-process-main">
              <strong>{row.findingTitle}</strong>
              <em>{rowStatusLabel(row)} · 第 {row.page} 页 · {row.chapter}</em>
            </span>
            <span className="fix-process-result">{row.status === 'needs-review' ? '可确认' : '可回退'}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
