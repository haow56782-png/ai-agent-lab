// DiffStatusBar — human-readable status + ring progress for Step4 confirmation.
// Shows: "还有 3 处需要你确认" / "所有格式已确认，可以导出了 🎉"
// Ring progress: confirmed / total with SVG circle.

import React from 'react';
import { getDiffConfirmationProgress } from './diffStatusProgress';

interface DiffStatusBarProps {
  total: number;
  pendingCount: number;
  acceptedCount: number;
  rejectedCount: number;
  passedCount: number;   // auto-passed rules
  failCount: number;
}

export const DiffStatusBar: React.FC<DiffStatusBarProps> = ({
  total,
  pendingCount,
  acceptedCount,
  rejectedCount,
  passedCount,
  failCount,
}) => {
  const progress = getDiffConfirmationProgress({ total, acceptedCount, rejectedCount });
  const confirmedRatio = progress.ratio;
  const isComplete = pendingCount === 0 && failCount === 0 && total > 0;

  // Status text and color
  let statusText: string;
  let statusColor: string;

  if (failCount > 0) {
    statusText = `有 ${failCount} 处格式不达标，需要修改后重新上传`;
    statusColor = 'var(--status-fail)';
  } else if (pendingCount > 0) {
    statusText = `还有 ${pendingCount} 处需要你确认`;
    statusColor = 'var(--status-review)';
  } else if (isComplete) {
    statusText = '所有格式已确认，可以导出了 🎉';
    statusColor = 'var(--status-pass)';
  } else {
    statusText = '暂无格式问题';
    statusColor = 'var(--status-pass)';
  }

  // SVG ring progress
  const ringR = 18;
  const ringCircumference = 2 * Math.PI * ringR;
  const ringOffset = ringCircumference * (1 - Math.min(1, confirmedRatio));
  const ringSize = 48;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '12px 32px',
        borderBottom: '1px solid var(--border-light)',
        background: 'var(--bg-surface)',
        minHeight: 48,
      }}
    >
      {/* Status text with color bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flex: 1,
          minWidth: 0,
        }}
        role="status"
        aria-live="polite"
      >
        <div
          style={{
            width: 4,
            height: 22,
            borderRadius: 2,
            background: statusColor,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: 16,
            fontWeight: 500,
            color: 'var(--text-primary)',
          }}
        >
          {statusText}
        </span>
      </div>

      {/* Ring progress */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexShrink: 0,
        }}
      >
        {/* Summary counts */}
        <div style={{
          display: 'flex',
          gap: 6,
          fontSize: 13,
          color: 'var(--text-secondary)',
          alignItems: 'center',
        }}>
          {pendingCount > 0 && (
            <span style={{ color: 'var(--status-review)', fontWeight: 500 }}>⚠{pendingCount}</span>
          )}
          {failCount > 0 && (
            <span style={{ color: 'var(--status-fail)', fontWeight: 500 }}>✕{failCount}</span>
          )}
          {acceptedCount > 0 && (
            <span style={{ color: 'var(--status-pass)', fontWeight: 400, fontSize: 11 }}>已确认 {acceptedCount}</span>
          )}
          {rejectedCount > 0 && (
            <span style={{ color: 'var(--text-tertiary)', fontWeight: 400, fontSize: 11 }}>已忽略 {rejectedCount}</span>
          )}
          {passedCount > 0 && (
            <span style={{ color: 'var(--text-tertiary)', fontWeight: 400, fontSize: 11 }}>自动通过 {passedCount}</span>
          )}
        </div>

        {/* SVG ring */}
        <svg
          width={ringSize}
          height={ringSize}
          viewBox={`0 0 ${ringSize} ${ringSize}`}
          style={{ flexShrink: 0 }}
          role="progressbar"
          aria-valuenow={progress.percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`确认进度 ${progress.percent}%`}
        >
          {/* Background circle */}
          <circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={ringR}
            fill="none"
            stroke="var(--border-light)"
            strokeWidth={3}
          />
          {/* Progress arc */}
          <circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={ringR}
            fill="none"
            stroke={isComplete ? 'var(--status-pass)' : statusColor}
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray={ringCircumference}
            strokeDashoffset={ringOffset}
            transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
            style={{
              transition: 'stroke-dashoffset 400ms var(--ease-standard), stroke 300ms',
            }}
          />
          {/* Center text */}
          {isComplete ? (
            <text
              x={ringSize / 2}
              y={ringSize / 2 + 1}
              textAnchor="middle"
              dominantBaseline="central"
              fill="var(--status-pass)"
              fontSize={14}
              fontWeight={700}
            >
              ✓
            </text>
          ) : (
            <text
              x={ringSize / 2}
              y={ringSize / 2 + 1}
              textAnchor="middle"
              dominantBaseline="central"
              fill="var(--text-primary)"
              fontSize={11}
              fontWeight={600}
            >
              {progress.percent}%
            </text>
          )}
        </svg>
      </div>
    </div>
  );
};
