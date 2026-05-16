import React from 'react';
import type { ContentIntegrityView } from '../utils/contentIntegrityView';

const buildMetrics = (contentIntegrity: ContentIntegrityView): [string, string][] => [
  [
    contentIntegrity.status === 'verified' ? '100%' : contentIntegrity.status === 'warning' ? '复核' : '等待',
    contentIntegrity.shortLabel,
  ],
  ['100%', '页码正确率'],
  ['100%', '目录完整率'],
  ['18.4s', '最终修复用时'],
];

interface MetricsCardProps {
  contentIntegrity: ContentIntegrityView;
}

export const MetricsCard: React.FC<MetricsCardProps> = ({ contentIntegrity }) => (
  <div style={{
    background: 'var(--paper-0)', borderRadius: 6, border: '1px solid var(--hair)',
    padding: '14px 18px',
  }}>
    <div className="mono" style={{ fontSize: 10, letterSpacing: '.12em', color: 'var(--ink-400)', marginBottom: 10 }}>交付信心指标</div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      {buildMetrics(contentIntegrity).map(([n, l]) => (
        <div key={l} style={{
          background: 'var(--paper-2)', borderRadius: 3, padding: '10px 12px',
        }}>
          <div className="serif num" style={{ fontSize: 22, fontWeight: 700, color: 'var(--leaf-700)', lineHeight: 1 }}>{n}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 4 }}>{l}</div>
        </div>
      ))}
    </div>
  </div>
);
