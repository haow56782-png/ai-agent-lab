import React from 'react';

interface FixSummaryCardProps {
  items: string[];
}

export const FixSummaryCard: React.FC<FixSummaryCardProps> = ({ items }) => (
  <div style={{
    background: 'var(--paper-0)', borderRadius: 6, border: '1px solid var(--hair)',
    padding: '18px 20px', marginBottom: 16,
  }}>
    <div className="serif" style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink-900)', marginBottom: 10 }}>
      这次推进的关键结果
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {items.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--ink-700)' }}>
          <span style={{ color: 'var(--leaf-600)', fontSize: 11 }}>✅</span>
          {s}
        </div>
      ))}
    </div>
    <div style={{ marginTop: 10, padding: '8px 10px', background: 'var(--sun-100)', borderRadius: 3, fontSize: 12, color: 'var(--sun-700)' }}>
      ⚠️ 1 处脚注格式需手动检查（第 12 页）
    </div>
  </div>
);
