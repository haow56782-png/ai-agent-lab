import React from 'react';
import { Btn } from './Common';
import type { BaseStandardVersion } from './AppFrame';

export interface DraftProfileCardData {
  id: string;
  name: string;
  faculty: string;
  rules: number;
  match: number;
  baseStandardVersion?: BaseStandardVersion;
}

interface DraftProfileCardProps {
  draft: DraftProfileCardData;
  onUse: () => void;
}

export const DraftProfileCard: React.FC<DraftProfileCardProps> = ({ draft, onUse }) => (
  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px 22px 0' }}>
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
      <div style={{
        width: 44, height: 44, borderRadius: 22,
        background: 'var(--brand-700)', color: 'var(--paper-0)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 600,
      }}>范</div>
      <div style={{ flex: 1 }}>
        <div className="serif" style={{ fontSize: 20, fontWeight: 600, color: 'var(--ink-900)', letterSpacing: -.2 }}>
          {draft.name} · {draft.faculty}
        </div>
        <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-500)', marginTop: 4, letterSpacing: '.04em' }}>
          draft profile · 由上传范文自动反推 · {draft.rules} 条规则 · 覆盖 {draft.match}%
        </div>
        <div className="mono" style={{ fontSize: 10, color: 'var(--ink-400)', marginTop: 3 }}>
          国标基线 · {draft.baseStandardVersion || 'GB/T 7713.1-2006'}
        </div>
      </div>
      <span className="chip sun">待你确认</span>
    </div>
    <div style={{ padding: '12px 14px', background: 'var(--sun-100)', borderRadius: 4, marginBottom: 16, fontSize: 12, color: 'var(--sun-700)' }}>
      <strong>这套规则是系统从范文里反推出来的</strong>，已经能帮你起步，但最好逐条确认后再拿去正式交稿。上传更完整的格式手册，可以继续提升覆盖度。
    </div>
    <div className="hrule" />
    <div style={{ flex: 1, overflow: 'auto', paddingTop: 14 }}>
      <div style={{ fontSize: 10, color: 'var(--ink-400)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 8 }}>规则速览（系统预估）</div>
      {[
        ['A. 页面基础', 'A4 · 上 25 / 下 25 / 左 30 / 右 25 mm'],
        ['I. 正文段落', '宋体 · 小四 · 1.5 倍行距 · 首行缩进 2 字符'],
        ['H. 章节标题', '黑体 · 三号（一级）· 居中 · 段前 24 段后 18'],
        ['L. 表格 / M. 图片', '三线表 · 宋体五号 · 题注章节编号'],
        ['O. 参考文献', 'GB/T 7714-2015 · 顺序编码制'],
      ].map(([k, v], i, a) => (
        <div key={i} style={{
          display: 'grid', gridTemplateColumns: '100px 1fr', gap: 12,
          padding: '8px 0', borderBottom: i < a.length - 1 ? '1px dashed var(--hair)' : 'none',
          fontSize: 12, alignItems: 'baseline',
        }}>
          <div className="mono" style={{ color: 'var(--ink-500)', fontSize: 11 }}>{k}</div>
          <div style={{ color: 'var(--ink-700)' }}>{v}</div>
        </div>
      ))}
    </div>
    <div style={{
      display: 'flex', justifyContent: 'flex-end', gap: 8,
      padding: '14px 0', borderTop: '1px solid var(--hair)',
    }}>
      <Btn kind="primary" onClick={onUse}>先按这套规则继续</Btn>
    </div>
  </div>
);
