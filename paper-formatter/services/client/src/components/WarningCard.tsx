import React from 'react';
import { Icon } from './Common';

interface WarningItem {
  tag: string;
  title: string;
  detail: string;
  page: string;
}

interface WarningCardProps {
  warnings: number;
  items: WarningItem[];
  onNavigate: () => void;
}

export const WarningCard: React.FC<WarningCardProps> = ({ warnings, items, onNavigate }) => (
  <div style={{
    background: 'var(--paper-0)', borderRadius: 6,
    border: '1px solid var(--sun-500)', overflow: 'hidden', marginBottom: 16,
  }}>
    <div style={{
      padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10,
      background: 'var(--sun-100)', borderBottom: '1px solid var(--sun-500)',
    }}>
      <Icon name="warn" size={16} color="var(--sun-700)" ariaLabel="警告" />
      <div className="serif" style={{ fontSize: 15, fontWeight: 600, color: 'var(--sun-700)' }}>{warnings} 处建议你亲自再看一眼</div>
      <span style={{ flex: 1 }} />
      <span className="mono" style={{ fontSize: 10.5, color: 'var(--sun-700)', letterSpacing: '.08em' }}>FORMAT-ONLY · 不阻断交稿</span>
    </div>
    {items.map((r, i, a) => (
      <div key={i} style={{
        padding: '14px 18px', display: 'flex', gap: 14,
        borderBottom: i < a.length - 1 ? '1px solid var(--hair)' : 'none',
      }}>
        <span className="chip sun" style={{ flex: '0 0 auto' }}>{r.tag}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, color: 'var(--ink-900)', fontWeight: 500, marginBottom: 4 }}>{r.title}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-500)', lineHeight: 1.55 }}>{r.detail}</div>
        </div>
        <div style={{ textAlign: 'right', flex: '0 0 auto', minWidth: 70 }}>
          <div className="mono" style={{ fontSize: 11, color: 'var(--ink-500)', marginBottom: 6 }}>{r.page}</div>
          <button onClick={onNavigate} style={{
            border: '1px solid var(--hair-strong)', background: 'transparent',
            fontSize: 11, padding: '4px 8px', borderRadius: 3, cursor: 'pointer',
            fontFamily: 'var(--sans)', color: 'var(--ink-700)',
          }}>去确认</button>
        </div>
      </div>
    ))}
  </div>
);
