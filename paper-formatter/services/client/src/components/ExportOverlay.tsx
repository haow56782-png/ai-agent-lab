import React from 'react';

export const ExportOverlay: React.FC = () => (
  <div style={{
    position: 'absolute', inset: 0, background: 'rgba(21,23,27,.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 999, animation: 'protoFade .2s ease',
  }}>
    <div style={{
      background: 'var(--paper-0)', borderRadius: 6, padding: '28px 32px',
      display: 'flex', alignItems: 'center', gap: 16, boxShadow: 'var(--shadow-card)',
      minWidth: 320,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 18,
        border: '3px solid var(--paper-2)',
        borderTopColor: 'var(--brand-700)',
        animation: 'protoSpin .8s linear infinite',
      }} />
      <div>
        <div className="serif" style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink-900)' }}>正在生成你的交稿稿件…</div>
        <div className="mono" style={{ fontSize: 11, color: 'var(--ink-500)', marginTop: 4 }}>格式落稿 · 正文指纹比对 · 交付校验</div>
      </div>
    </div>
  </div>
);
