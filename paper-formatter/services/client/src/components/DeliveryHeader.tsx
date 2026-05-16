import React from 'react';
import type { ContentIntegrityView } from '../utils/contentIntegrityView';

interface DeliveryHeaderProps {
  contentIntegrity: ContentIntegrityView;
  deliveryNarrative: string;
  oldScore: number;
  newScore: number;
}

export const DeliveryHeader: React.FC<DeliveryHeaderProps> = ({
  contentIntegrity, deliveryNarrative, oldScore, newScore,
}) => (
  <div style={{
    background: 'var(--paper-0)', borderRadius: 6, border: '1px solid var(--hair)',
    padding: '24px 28px', marginBottom: 16,
    display: 'grid', gridTemplateColumns: '1fr auto', gap: 20,
    alignItems: 'center',
    animation: 'protoFadeUp .35s ease',
  }}>
    <div>
      <div className="serif" style={{ fontSize: 22, fontWeight: 600, color: 'var(--ink-900)', letterSpacing: -.3, marginBottom: 6 }}>
        📊 交稿前确认
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--ink-500)', marginBottom: 12, lineHeight: 1.55 }}>
        {deliveryNarrative}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ textAlign: 'center' }}>
          <div className="mono" style={{ fontSize: 10, color: 'var(--ink-400)' }}>处理前</div>
          <div className="mono num" style={{ fontSize: 28, fontWeight: 700, color: 'var(--ink-500)', textDecoration: 'line-through' }}>
            {oldScore}
          </div>
        </div>
        <div style={{ fontSize: 22, color: 'var(--ink-400)' }}>→</div>
        <div style={{ textAlign: 'center' }}>
          <div className="mono" style={{ fontSize: 10, color: 'var(--ink-400)' }}>现在</div>
          <div className="mono num" style={{ fontSize: 36, fontWeight: 700, color: 'var(--leaf-600)' }}>
            {newScore}
          </div>
        </div>
        {newScore >= 95 && <div style={{ fontSize: 22 }}>🎉</div>}
      </div>
    </div>
    <div style={{ textAlign: 'right' }}>
      <div style={{
        fontSize: 12, color: 'var(--ink-600)', lineHeight: 1.5,
        marginBottom: 8,
      }}>
        <div>{contentIntegrity.status === 'warning' ? '⚠ 正文内容需要复核' : '✅ 你的论文内容按正文指纹校验保护'}</div>
        <div className="mono" style={{ fontSize: 10.5, color: contentIntegrity.toneColor }}>
          {contentIntegrity.shortLabel} · {contentIntegrity.detail}
        </div>
      </div>
    </div>
  </div>
);
