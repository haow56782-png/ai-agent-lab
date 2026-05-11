import React from 'react';
import { SpinDot } from './Common';

export type StepStatus = 'pending' | 'fixing' | 'done' | 'skipped' | 'failed';

export interface FixStepItem {
  type: string;
  label: string;
  icon: string;
  desc: string;
  status: StepStatus;
  summary?: string;
}

interface FixStepRowProps {
  step: FixStepItem;
  index: number;
  totalSteps: number;
  fixing: boolean;
  showPaywall: boolean;
}

export const FixStepRow: React.FC<FixStepRowProps> = ({ step, index, totalSteps, fixing, showPaywall }) => {
  const isActive = step.status === 'fixing';
  const isDone = step.status === 'done' || step.status === 'skipped';

  return (
    <div style={{
      padding: '12px 18px',
      borderBottom: index < totalSteps - 1 && !(showPaywall && index === 2) ? '1px solid var(--hair)' : 'none',
      opacity: step.status === 'pending' && !fixing ? 0.6 : 1,
      display: 'flex', alignItems: 'center', gap: 12,
      background: isActive ? 'var(--brand-50)' : 'transparent',
      transition: 'background .25s',
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 14,
        background: isDone ? 'var(--leaf-100)' : isActive ? 'var(--brand-100)' : 'var(--paper-2)',
        color: isDone ? 'var(--leaf-700)' : isActive ? 'var(--brand-700)' : 'var(--ink-400)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontFamily: 'var(--mono)', fontWeight: 700,
        flex: '0 0 auto', transition: 'all .25s',
      }}>
        {isDone ? '✓' : isActive ? <SpinDot /> : index + 1}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: isActive ? 600 : 500,
          color: isDone ? 'var(--ink-500)' : isActive ? 'var(--ink-900)' : 'var(--ink-700)',
        }}>
          {step.icon} {step.label}
        </div>
        <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-400)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {isDone ? (step.summary || step.desc) : step.desc}
        </div>
      </div>
      {isDone && <span style={{ fontSize: 10, color: 'var(--leaf-700)', fontFamily: 'var(--mono)' }}>已修复</span>}
      {isActive && <span style={{ fontSize: 10, color: 'var(--brand-700)', fontFamily: 'var(--mono)' }}>修复中…</span>}
    </div>
  );
};
