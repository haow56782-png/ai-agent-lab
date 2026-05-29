import React, { useEffect, useRef, useState } from 'react';
import { FixBeforeAfterModal } from './FixBeforeAfterModal';
import {
  buildRepairExplanation,
  cleanRuleLabel,
  FixProcessDrawer,
  rowStatusLabel,
  rowStatusTone,
} from './FixProcessDrawer';
import { FixRuntimeStreamReport } from './FixRuntimeStreamReport';
import { FixSafetyNotice } from './FixSafetyNotice';
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
  const [processOpen, setProcessOpen] = useState(false);
  const [safetyHighlighted, setSafetyHighlighted] = useState(false);
  const focusTimerRef = useRef<number | null>(null);
  const safetyNoticeRef = useRef<HTMLElement | null>(null);
  const safetyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (focusTimerRef.current !== null) clearTimeout(focusTimerRef.current);
      if (safetyTimerRef.current !== null) clearTimeout(safetyTimerRef.current);
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

  const focusSafetyNotice = () => {
    if (safetyTimerRef.current !== null) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }

    setSafetyHighlighted(true);
    safetyNoticeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    safetyNoticeRef.current?.focus({ preventScroll: true });
    safetyTimerRef.current = window.setTimeout(() => {
      setSafetyHighlighted(false);
      safetyTimerRef.current = null;
    }, 1800);
  };

  const filteredRows = timelineRows.filter((row) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'written') return row.status === 'done' || row.status === 'live';
    if (activeFilter === 'review') return row.status === 'needs-review';
    return false;
  });
  const progressTotal = Math.max(1, findingStatusSummary.autoFixableTotal || findingStatusSummary.total || timelineRows.length);
  const progressCurrent = Math.min(progressTotal, findingStatusSummary.writtenBack);
  const progressPercent = Math.round((progressCurrent / progressTotal) * 100);
  const currentTaskRow = filteredRows.find((row) => row.status === 'live')
    || (focusedRowId ? filteredRows.find((row) => row.id === focusedRowId) : null)
    || filteredRows.find((row) => row.status === 'done')
    || filteredRows[0]
    || null;
  const compareCandidate = currentTaskRow;
  const currentTaskExplanation = currentTaskRow ? buildRepairExplanation(currentTaskRow) : null;
  const completedTotal = findingStatusSummary.total || findingStatusSummary.autoFixableTotal || timelineRows.length;
  const isCompleted = viewDiffEnabled;
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
      {isCompleted ? (
        <>
          <section className="fix-runtime-complete-card" data-testid="fix-runtime-complete-card">
            <div className="fix-runtime-complete-head">
              <span>修复进度</span>
              <strong>✓ {findingStatusSummary.writtenBack} / {completedTotal}</strong>
            </div>
            <div
              className="fix-runtime-inline-progress is-complete"
              role="progressbar"
              aria-label="发现项写回进度"
              aria-valuemin={0}
              aria-valuemax={completedTotal}
              aria-valuenow={findingStatusSummary.writtenBack}
            >
              <span style={{ width: '100%' }} />
            </div>
            <div className="fix-runtime-complete-stats">
              <div>
                <span>已写回</span>
                <b>{findingStatusSummary.writtenBack}</b>
              </div>
              <div>
                <span>待确认</span>
                <b>{findingStatusSummary.needsReview}</b>
              </div>
            </div>
            <button
              type="button"
              className="fix-runtime-complete-primary"
              onClick={onViewDiff}
            >
              进入校对台 →
            </button>
            <button
              type="button"
              className="fix-runtime-complete-secondary"
              onClick={() => compareCandidate && setCompareRow(compareCandidate)}
              disabled={!compareCandidate}
            >
              查看修复前后对比
            </button>
          </section>
          <div className="fix-runtime-complete-note">
            进度满格静止 + 品牌绿 CTA = 明确“已完成”；0 项待确认时文案为“进入校对台”。
          </div>

          <section className="fix-runtime-complete-flat">
            <h3>修复记录</h3>
            <FixRuntimeStreamReport
              writtenBack={findingStatusSummary.writtenBack}
              processCount={filteredRows.length}
              onOpenProcess={() => setProcessOpen(true)}
              onShowSafety={focusSafetyNotice}
            />
          </section>

          <FixProcessDrawer
            rows={filteredRows}
            activeFilter={activeFilter}
            open={processOpen}
            onClose={() => setProcessOpen(false)}
            onJumpToRow={jumpAndFrameCard}
            focusedRowId={focusedRowId}
          />

          <FixSafetyNotice ref={safetyNoticeRef} highlighted={safetyHighlighted} />
          <FixBeforeAfterModal row={compareRow} onClose={() => setCompareRow(null)} />
        </>
      ) : (
        <>
      <div className="fix-runtime-cockpit-head" data-testid="fix-runtime-action-count">
        <div>
          <div className="fix-runtime-note-head">当前发现项</div>
          <strong>{progressCurrent} / {progressTotal}</strong>
        </div>
        <span>{findingStatusSummary.needsReview} 项待确认</span>
      </div>
      <div
        className="fix-runtime-inline-progress"
        role="progressbar"
        aria-label="发现项写回进度"
        aria-valuemin={0}
        aria-valuemax={progressTotal}
        aria-valuenow={progressCurrent}
      >
        <span style={{ width: `${progressPercent}%` }} />
      </div>

      {currentTaskRow && currentTaskExplanation ? (
        <article
          className={[
            'fix-current-task-card',
            `status-${rowStatusTone(currentTaskRow)}`,
            currentTaskRow.status === 'live' ? 'is-live' : '',
          ].filter(Boolean).join(' ')}
          data-testid="fix-runtime-current-task-card"
        >
          <div className="fix-current-task-card-head">
            <span>{rowStatusLabel(currentTaskRow)}</span>
            <b>第 {currentTaskRow.page} 页 · {currentTaskRow.chapter}</b>
          </div>
          <h3>{currentTaskRow.findingTitle}</h3>
          <dl className="fix-current-task-triplet">
            <div className="tone-ink">
              <dt>证据</dt>
              <dd>{currentTaskExplanation.problem}</dd>
            </div>
            <div className="tone-brand">
              <dt>规则</dt>
              <dd>{cleanRuleLabel(currentTaskRow.ruleLabel)}</dd>
            </div>
            <div className="tone-rust">
              <dt>修改</dt>
              <dd>{currentTaskExplanation.action}</dd>
            </div>
            <div className="tone-leaf">
              <dt>安全</dt>
              <dd>{currentTaskExplanation.safety}</dd>
            </div>
          </dl>
        </article>
      ) : (
        <div className="fix-runtime-empty-state">
          <strong>等待修复任务</strong>
          <span>系统会在这里展示当前正在处理的发现项。</span>
        </div>
      )}

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
        className="fix-runtime-process-toggle"
        onClick={() => setProcessOpen((current) => !current)}
        aria-expanded={processOpen}
      >
        {processOpen ? '收起完整修复过程' : `查看完整修复过程 · ${filteredRows.length} 项`}
      </button>

      <FixProcessDrawer
        rows={filteredRows}
        activeFilter={activeFilter}
        open={processOpen}
        onClose={() => setProcessOpen(false)}
        onJumpToRow={jumpAndFrameCard}
        focusedRowId={focusedRowId}
      />

      <FixSafetyNotice />

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
        </>
      )}
    </aside>
  );
};
