import React from 'react';

interface FixBottomBarProps {
  allDone: boolean;
  totalCount: number;
  onContinue: () => void;
}

export const FixBottomBar: React.FC<FixBottomBarProps> = ({
  allDone, totalCount, onContinue,
}) => allDone ? (
  <div style={{
    position: 'sticky', bottom: 0, left: 0, right: 0,
    background: 'var(--paper-0)', borderTop: '1px solid var(--hair)',
    padding: '12px 56px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    boxShadow: '0 -4px 12px rgba(0,0,0,.06)',
    zIndex: 10,
  }}>
    <div style={{ fontSize: 13, color: 'var(--ink-700)', display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--leaf-500)' }} />
      全部 {totalCount} 项修复完成
    </div>
    <div style={{ display: 'flex', gap: 8 }}>
      <button onClick={onContinue} style={{
        height: 38, padding: '0 22px', borderRadius: 4,
        border: 'none', background: 'var(--ink-900)', color: 'var(--paper-0)',
        fontSize: 13, fontWeight: 600, fontFamily: 'var(--sans)',
        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
      }}>
        ✓ 进入人工确认
      </button>
    </div>
  </div>
) : null;
