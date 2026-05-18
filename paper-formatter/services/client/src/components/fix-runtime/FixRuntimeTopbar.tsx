import React from 'react';
import type { ActiveFixFinding, FixFindingStatusSummary, FixRuntimeStore } from './types';
import { formatDuration } from './utils';

interface Props {
  runtimeStore: FixRuntimeStore;
  findingStatusSummary: FixFindingStatusSummary;
  documentTitle: string;
  displayedPageNumber: number;
  displayedChapter: string;
  activeFinding: ActiveFixFinding | null;
  onPauseToggle: () => void;
  onSpeedChange: (speed: 1 | 2 | 4) => void;
  onJumpToComplete: () => void;
  onStartFix?: () => void;
}

export const FixRuntimeTopbar: React.FC<Props> = ({
  runtimeStore,
  findingStatusSummary,
  documentTitle,
  displayedPageNumber,
  displayedChapter,
  activeFinding,
  onPauseToggle,
  onJumpToComplete,
  onStartFix,
}) => {
  const progress = findingStatusSummary.autoFixableTotal > 0
    ? Math.round((findingStatusSummary.writtenBack / findingStatusSummary.autoFixableTotal) * 100)
    : Math.max(0, Math.min(100, runtimeStore.progressPct));
  const isCompleted = runtimeStore.status === 'completed';
  const isPaused = runtimeStore.status === 'paused';
  const notStarted = isPaused && progress === 0 && findingStatusSummary.writtenBack === 0;
  const remainingLabel = isCompleted
    ? findingStatusSummary.notAutoFixed > 0
      ? `写回完成 · ${findingStatusSummary.notAutoFixed} 项未自动修复`
      : '已完成'
    : runtimeStore.estimatedRemainingMs > 0
    ? `剩余 ${formatDuration(runtimeStore.estimatedRemainingMs)}`
    : '服务写回中';
  const findingProgressLabel = `${findingStatusSummary.writtenBack}/${findingStatusSummary.autoFixableTotal}`;
  const activeRuleLabel = activeFinding?.ruleLabel || '学校规则 + 国标基线';
  const compactRuleLabel = /学校规则|GB\/T|7713|vAuto/i.test(activeRuleLabel)
    ? '学校规则 + GB/T 7713.1'
    : activeRuleLabel;
  const activeTargetLabel = activeFinding
    ? `第 ${activeFinding.page} 页 · ${activeFinding.chapter}`
    : `第 ${displayedPageNumber} 页 · ${displayedChapter}`;
  const activeFixLabel = activeFinding?.ruleLabel || activeFinding?.label || '等待修复队列';

  return (
    <header className="fix-runtime-topbar">
      <div className="fix-runtime-document-meta">
        <div className="fix-runtime-title">修复产物 · {documentTitle}</div>
        <div className="fix-runtime-subtitle">
          修复完成后进入人工确认，可逐项确认或回退。
        </div>
      </div>

      <div className="fix-runtime-stage-status fix-runtime-progress">
        <div
          className="fix-runtime-progress-track"
          role="progressbar"
          aria-label="修复进度"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <div className="fix-runtime-progress-bar" style={{ width: `${progress}%` }} />
        </div>
        <div className="fix-runtime-progress-meta">
          <span className="fix-runtime-finding-meta" data-testid="fix-runtime-topbar-finding">
            当前正在修复 {findingProgressLabel}：{activeFixLabel}
          </span>
          <span data-testid="fix-runtime-topbar-page">
            {activeTargetLabel} · 写回进度 {findingProgressLabel}
          </span>
          <span data-testid="fix-runtime-topbar-remaining">
            {remainingLabel}
          </span>
        </div>
        <div className="fix-runtime-progress-explain" data-testid="fix-runtime-topbar-explain">
          依据：{compactRuleLabel} · 本次只调整页面格式，不改变正文语义。
        </div>
      </div>

      <div className="fix-runtime-toolbar-actions fix-runtime-controls">
        {notStarted && onStartFix ? (
          <button type="button" className="fix-control-button is-start" onClick={onStartFix}>
            启动修复
          </button>
        ) : (
          <button
            type="button"
            className="fix-control-button is-subtle"
            onClick={onPauseToggle}
            disabled={isCompleted}
          >
            {isPaused ? '继续' : '暂停'}
          </button>
        )}
        <button
          type="button"
          className="fix-control-button"
          onClick={onJumpToComplete}
          disabled={isCompleted}
        >
          跳过动画，查看结果
        </button>
      </div>
    </header>
  );
};
