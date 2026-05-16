import React, { useEffect, useRef, useState } from 'react';
import { FixBeforeAfterModal } from './FixBeforeAfterModal';
import { FixProcessDrawer } from './FixProcessDrawer';
import { FixSafetyNotice } from './FixSafetyNotice';
import { FixSummaryCards } from './FixSummaryCards';
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
  runtimeStore,
  findingStatusSummary,
  timelineRows,
  viewDiffEnabled,
  diffPulse,
  rightFeedRef,
  onScroll,
  onJumpToAction,
  onViewDiff,
}) => {
  const statusLabelMap: Record<TimelineRow['status'], string> = {
    live: '正在写回',
    'needs-review': '待确认',
    done: '已写回',
  };
  const statusToneClassMap: Record<TimelineRow['status'], string> = {
    live: 'is-live',
    'needs-review': 'is-needs-review',
    done: 'is-done',
  };
  const [focusedRowId, setFocusedRowId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FixTaskFilter>('all');
  const [expandedEvidenceRowId, setExpandedEvidenceRowId] = useState<string | null>(null);
  const [compareRow, setCompareRow] = useState<TimelineRow | null>(null);
  const [processDrawerOpen, setProcessDrawerOpen] = useState(false);
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
    focusTimerRef.current = window.setTimeout(() => setFocusedRowId(null), 2000);

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
  const currentRow = timelineRows.find((row) => row.status === 'live') || timelineRows[0] || null;
  const readableRuleLabel = (row: TimelineRow) => {
    if (/国标|GB\/T|7713/.test(row.ruleLabel)) return '学校规则 + GB/T 7713.1';
    if (/学校规则|vAuto/.test(row.ruleLabel)) return '学校规则 + GB/T 7713.1';
    return '学校规则 + 国标基线';
  };
  const setFilterAndOpenDrawer = (filter: FixTaskFilter) => {
    setActiveFilter((current) => {
      const next = current === filter ? 'all' : filter;
      setProcessDrawerOpen(true);
      return next;
    });
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
        当前修复
      </div>
      <FixSummaryCards
        summary={findingStatusSummary}
        activeFilter={activeFilter}
        onFilterChange={setFilterAndOpenDrawer}
      />
      <div className="fix-runtime-current-task-wrap">
        {!currentRow ? (
          <div className="fix-runtime-empty-state">
            <strong>当前没有需要自动修复的发现项</strong>
            <span>你可以进入确认页查看检测摘要，或返回重新选择学校规则。</span>
          </div>
        ) : (
          <article
            key={currentRow.id}
            data-testid={`fix-runtime-action-card-${currentRow.id}`}
            data-finding-id={currentRow.findingId}
            data-page-number={currentRow.page}
            className={[
              'fix-runtime-current-task-card',
              'fix-runtime-action-card',
              statusToneClassMap[currentRow.status],
              focusedRowId === currentRow.id ? 'is-user-focus' : '',
            ].filter(Boolean).join(' ')}
            onClick={(event) => jumpAndFrameCard(currentRow, event.currentTarget)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); jumpAndFrameCard(currentRow, e.currentTarget); } }}
            role="button"
            tabIndex={0}
            aria-label={`跳转到发现项 ${currentRow.findingTitle}，状态：${currentRow.stateLabel}`}
          >
            <div className="fix-runtime-action-meta">
              <span>{currentRow.timestamp}</span>
              <span className="fix-runtime-action-anchor">证据 · {currentRow.chapter}</span>
            </div>
            <div className="fix-runtime-action-finding">{currentRow.findingTitle}</div>
            {currentRow.status === 'live' ? (
              <div className="fix-runtime-action-live-strip" aria-hidden="true">
                <span />
                <span />
                <span />
                <b>正在写入纸面</b>
              </div>
            ) : null}
            <div className="fix-runtime-action-before">
              <span className={`fix-runtime-action-dot ${statusToneClassMap[currentRow.status]}`} />
              {statusLabelMap[currentRow.status]}
            </div>
            <div className="fix-runtime-action-after">
              <strong>证据</strong>
              <span>{currentRow.stateSummary}</span>
            </div>
            <div className="fix-runtime-action-after">
              <strong>修复动作</strong>
              <span>{currentRow.recentActionSummary}</span>
            </div>
            <div className="fix-runtime-action-safe">
              安全说明：只修改格式属性，不改变论文语义。
            </div>
            {currentRow.progressSummary ? (
              <div className="fix-runtime-action-after">
                <strong>进展</strong>
                <span>{currentRow.progressSummary}</span>
              </div>
            ) : null}
            <div className="fix-runtime-action-rule">规则依据：{readableRuleLabel(currentRow)}</div>
            {expandedEvidenceRowId === currentRow.id ? (
              <div className="fix-runtime-evidence-box">
                <strong>识别依据</strong>
                <span>系统在第 {currentRow.page} 页定位到该段落/对象，并按学校规则与国标基线比对字体、字号、标题层级、图题或段落属性。</span>
                <span>状态：{currentRow.status === 'needs-review' ? '存在上下文歧义，建议人工确认后再应用。' : '已写回修复稿，最终确认页可复核并撤回。'}</span>
              </div>
            ) : null}
            <div className="fix-runtime-card-actions">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setExpandedEvidenceRowId((current) => current === currentRow.id ? null : currentRow.id);
                }}
              >
                查看识别依据
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setCompareRow(currentRow);
                }}
              >
                查看修复前后对比
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  jumpAndFrameCard(currentRow, event.currentTarget.closest('.fix-runtime-action-card') as HTMLElement || event.currentTarget);
                }}
              >
                跳转到该位置
              </button>
            </div>
          </article>
        )}
      </div>

      <div className="fix-runtime-bottom-meta">
        <span className={`fix-runtime-status-dot status-${runtimeStore.status}`} />
        <span>
          已自动修复 {findingStatusSummary.writtenBack} 项 ·
          待你确认 {findingStatusSummary.needsReview} 项 ·
          暂未处理 {findingStatusSummary.notAutoFixed} 项
        </span>
      </div>

      <FixSafetyNotice />

      <button
        type="button"
        className="fix-runtime-process-toggle"
        onClick={() => {
          setActiveFilter('all');
          setProcessDrawerOpen(true);
        }}
      >
        查看修复过程
      </button>

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
      <FixProcessDrawer
        rows={filteredRows}
        activeFilter={activeFilter}
        open={processDrawerOpen}
        onClose={() => setProcessDrawerOpen(false)}
        onJumpToRow={jumpAndFrameCard}
      />
    </aside>
  );
};
