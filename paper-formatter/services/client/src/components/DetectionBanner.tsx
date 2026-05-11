import React from 'react';
import { Btn } from './Common';

interface DetectionBannerProps {
  name: string;
  confidence: number;
  onAutoCreate: () => void;
  onDismiss: () => void;
}

export const DetectionBanner: React.FC<DetectionBannerProps> = ({ name, confidence, onAutoCreate, onDismiss }) => (
  <div className="card-hover" style={{
    padding: '12px 16px', background: 'var(--sun-100)',
    border: '1px solid var(--sun-300)', borderRadius: 4, marginBottom: 12,
  }}>
    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--sun-700)', marginBottom: 2 }}>
      论文里识别到新的学校线索：{name}
      <span className="mono" style={{ fontSize: 11, fontWeight: 400, marginLeft: 8 }}>
        置信度 {(confidence * 100).toFixed(0)}%
      </span>
    </div>
    <div style={{ fontSize: 12, color: 'var(--sun-600)', marginBottom: 8 }}>
      当前列表里还没有这所学校。自动补充后，这篇论文就能按它的规则继续走下去。
    </div>
    <div style={{ display: 'flex', gap: 8 }}>
      <Btn kind="primary" size="sm" onClick={onAutoCreate}>补进学校列表</Btn>
      <Btn kind="ghost" size="sm" onClick={onDismiss}>先忽略</Btn>
    </div>
  </div>
);
