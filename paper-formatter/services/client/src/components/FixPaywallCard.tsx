import React from 'react';
import { Btn } from './Common';

interface FixPaywallCardProps {
  freeFixLimit: number;
  totalCount: number;
  paywallPrice: string;
  onPay: () => void;
  onSkip: () => void;
}

export const FixPaywallCard: React.FC<FixPaywallCardProps> = ({
  freeFixLimit, totalCount, paywallPrice,
  onPay, onSkip,
}) => (
  <div style={{
    margin: '12px 18px 18px', padding: '20px 22px',
    borderRadius: 6, border: '1.5px dashed var(--sun-500)',
    background: 'var(--sun-100)',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <span style={{ fontSize: 20 }}>🔒</span>
      <div>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink-900)' }}>已先替你完成 {freeFixLimit} 组真实修复</div>
        <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 2 }}>{`还有 ${Math.max(totalCount - freeFixLimit, 0)} 组排版动作待写回，解锁后可继续把整篇论文推进到可交付状态`}</div>
      </div>
    </div>
    <div style={{
      display: 'flex', gap: 10, marginTop: 14,
      alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--brand-700)' }}>{paywallPrice}</div>
        <div style={{ fontSize: 10.5, color: 'var(--ink-500)' }}>单篇论文使用 · 本次有效</div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Btn kind="ghost" onClick={onSkip}>先保留当前进度</Btn>
        <button onClick={onPay} style={{
          height: 40, padding: '0 22px', borderRadius: 4,
          border: 'none', background: 'var(--brand-700)', color: '#fff',
          fontSize: 13, fontWeight: 600, fontFamily: 'var(--sans)',
          cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>
          💰 {paywallPrice} 继续真实修复
        </button>
      </div>
    </div>
    <div style={{ marginTop: 10, fontSize: 11, color: 'var(--ink-500)' }}>
      已完成的 {freeFixLimit} 组写回动作会保留，你可以先看效果，再决定是否把整篇论文继续推进到底
    </div>
  </div>
);
