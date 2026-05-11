import React from 'react';
import type { BaseStandardVersion } from './AppFrame';

const BASE_STANDARD_OPTIONS: Array<{
  id: BaseStandardVersion;
  label: string;
  short: string;
  note: string;
}> = [
  { id: 'GB/T 7713.1-2006', label: 'GB/T 7713.1-2006', short: '2006 基线', note: '适用于 2026-02-01 前已执行的旧版规范包' },
  { id: 'GB/T 7713.1-2025', label: 'GB/T 7713.1-2025', short: '2025 基线', note: '自 2026-02-01 起默认启用的新国标基线' },
];

interface BaseStandardSelectorProps {
  value: BaseStandardVersion;
  onChange: (v: BaseStandardVersion) => void;
}

export const BaseStandardSelector: React.FC<BaseStandardSelectorProps> = ({ value, onChange }) => (
  <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
    {BASE_STANDARD_OPTIONS.map(option => {
      const active = value === option.id;
      return (
        <button
          key={option.id}
          onClick={() => onChange(option.id)}
          style={{
            flex: 1,
            borderRadius: 6,
            border: `1px solid ${active ? 'var(--brand-700)' : 'var(--hair-strong)'}`,
            background: active ? 'var(--brand-50)' : 'var(--paper-0)',
            padding: '12px 14px',
            textAlign: 'left',
            cursor: 'pointer',
            fontFamily: 'var(--sans)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: active ? 'var(--brand-700)' : 'var(--ink-900)' }}>{option.short}</div>
            {active && <span className="chip brand">当前</span>}
          </div>
          <div className="mono" style={{ fontSize: 10, color: 'var(--ink-500)', marginBottom: 4 }}>{option.label}</div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-500)', lineHeight: 1.45 }}>{option.note}</div>
        </button>
      );
    })}
  </div>
);
