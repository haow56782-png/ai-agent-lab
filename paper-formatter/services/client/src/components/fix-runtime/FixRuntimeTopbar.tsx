import React from 'react';
import type { FixRuntimeStore } from './types';
import { formatDuration } from './utils';

interface Props {
  runtimeStore: FixRuntimeStore;
  documentTitle: string;
  displayedPageNumber: number;
  displayedChapter: string;
  onPauseToggle: () => void;
  onSpeedChange: (speed: 1 | 2 | 4) => void;
  onJumpToComplete: () => void;
}

const SPEEDS: Array<1 | 2 | 4> = [1, 2, 4];

export const FixRuntimeTopbar: React.FC<Props> = ({
  runtimeStore,
  documentTitle,
  displayedPageNumber,
  displayedChapter,
  onPauseToggle,
  onSpeedChange,
  onJumpToComplete,
}) => {
  const progress = Math.max(0, Math.min(100, runtimeStore.progressPct));
  const isCompleted = runtimeStore.status === 'completed';
  const isPaused = runtimeStore.status === 'paused';

  return (
    <header className="fix-runtime-topbar">
      <div style={{ minWidth: 0 }}>
        <div className="fix-runtime-title">修复产物 · {documentTitle}</div>
        <div className="fix-runtime-subtitle">
          严格按学校论文规范与国标基线推进，修复完成后进入人工确认。
        </div>
      </div>

      <div className="fix-runtime-progress">
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
          <span data-testid="fix-runtime-topbar-page">
            {progress}% · 第 {displayedPageNumber} 页 / 共 {runtimeStore.totalPages} 页 · {displayedChapter}
          </span>
          <span data-testid="fix-runtime-topbar-remaining">
            剩余 {formatDuration(runtimeStore.estimatedRemainingMs)}
          </span>
        </div>
      </div>

      <div className="fix-runtime-controls">
        <button
          type="button"
          className="fix-control-button"
          onClick={onPauseToggle}
          disabled={isCompleted}
        >
          {isPaused ? '继续' : '暂停'}
        </button>
        <div className="fix-speed-switch" aria-label="修复速度">
          {SPEEDS.map((speed) => (
            <button
              key={speed}
              type="button"
              className={runtimeStore.speed === speed ? 'is-active' : ''}
              onClick={() => onSpeedChange(speed)}
              aria-pressed={runtimeStore.speed === speed}
            >
              {speed}x
            </button>
          ))}
        </div>
        <button
          type="button"
          className="fix-control-button"
          onClick={onJumpToComplete}
          disabled={isCompleted}
        >
          跳到完成
        </button>
      </div>
    </header>
  );
};
