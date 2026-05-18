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

function rowStatusLabel(row: TimelineRow) {
  if (row.status === 'live') return '正在修复';
  if (row.status === 'needs-review') return '等待处理';
  return '已完成';
}

function rowStatusTone(row: TimelineRow) {
  if (row.status === 'live') return 'live';
  if (row.status === 'needs-review') return 'waiting';
  return 'done';
}

function humanizeRepairText(text: string) {
  return text
    .replace(/\breplace\b/gi, '调整')
    .replace(/\bdiff\b/gi, '修改对比')
    .replace(/\bpatch\b/gi, '写回')
    .replace(/\bfixType\b/gi, '修复类型')
    .replace(/\bfinding_id\b/gi, '发现项');
}

function isPageLayoutRow(row: TimelineRow) {
  const signal = `${row.findingTitle} ${row.findingLabel} ${row.ruleLabel}`.toLowerCase();
  return /页边距|页面|版心|纸张|装订线|page|margin|canvas/.test(signal);
}

function buildRepairExplanation(row: TimelineRow) {
  if (isPageLayoutRow(row)) {
    return {
      problem: '当前页面版心与学校模板要求不一致。',
      action: '系统正在调整页面边距，使正文区域与学校模板保持一致。',
      safety: '本次仅调整页面布局参数，不修改正文文字。',
    };
  }
  const signal = `${row.findingTitle} ${row.findingLabel} ${row.ruleLabel}`;
  if (/标题|层级|编号/.test(signal)) {
    return {
      problem: '当前标题样式与学校模板要求不一致。',
      action: '系统正在统一标题层级、字号和段前段后设置。',
      safety: '本次仅调整标题格式，不修改标题文字。',
    };
  }
  if (/参考文献|DOI|著录/.test(signal)) {
    return {
      problem: '当前参考文献著录格式与规范要求不一致。',
      action: '系统正在整理参考文献的标点、顺序和著录格式。',
      safety: '本次仅调整著录格式，不改动正文论述。',
    };
  }
  return {
    problem: '当前格式与所选学校模板要求不一致。',
    action: humanizeRepairText(row.stateSummary || row.recentActionSummary || '系统正在写回安全的格式修复。'),
    safety: '本次仅调整格式属性，不修改正文文字。',
  };
}

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
          const explanation = buildRepairExplanation(row);
          return (
            <button
              key={row.id}
              type="button"
              className={[
                'fix-process-row',
                'fix-runtime-action-card',
                `status-${rowStatusTone(row)}`,
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
                <strong>{rowStatusLabel(row)} · {row.findingTitle}</strong>
                <em>第 {row.page} 页 · {row.chapter}</em>
                <small><b>发现问题：</b>{explanation.problem}</small>
                <small><b>修复动作：</b>{explanation.action}</small>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
