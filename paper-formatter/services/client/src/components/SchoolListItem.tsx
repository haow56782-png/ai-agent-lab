import React from 'react';
import { Icon } from './Common';
import type { SchoolOption } from './AppFrame';

interface SchoolListItemProps {
  school: SchoolOption;
  selected: boolean;
  uploadCount: number;
  showBorder: boolean;
  effectiveFromLabel: string | null;
  onSelect: () => void;
}

export const SchoolListItem: React.FC<SchoolListItemProps> = ({
  school: s, selected, uploadCount, showBorder, effectiveFromLabel, onSelect,
}) => {
  return (
    <button onClick={onSelect} style={{
      padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14,
      borderBottom: showBorder ? '1px solid var(--hair)' : 'none',
      background: selected ? 'var(--brand-50)' : 'transparent',
      position: 'relative', textAlign: 'left',
      border: 'none',
      borderBottomColor: showBorder ? 'var(--hair)' : 'transparent',
      borderBottomStyle: 'solid', borderBottomWidth: showBorder ? 1 : 0,
      cursor: 'pointer', fontFamily: 'var(--sans)',
      width: '100%',
      transition: 'background .15s',
    }}>
      {selected && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: 'var(--brand-700)' }} />}
      <div style={{
        width: 36, height: 36, borderRadius: 18,
        background: selected ? 'var(--brand-700)' : 'var(--paper-2)',
        color: selected ? 'var(--paper-0)' : 'var(--ink-700)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--serif)', fontSize: 14, fontWeight: 600,
        transition: 'all .15s',
      }}>{s.initial}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-900)' }}>{s.name}</div>
        <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 2 }}>{s.faculty}</div>
        {uploadCount > 0 && (
          <div style={{ fontSize: 10.5, color: 'var(--ink-400)', marginTop: 1, letterSpacing: '.02em' }}>
            {uploadCount} 篇已上传
          </div>
        )}
        <div className="mono" style={{ fontSize: 10, color: 'var(--ink-400)', marginTop: 3 }}>
          {s.baseStandardVersion || 'GB/T 7713.1-2006'} · {s.sourceType === 'learned' ? '自动学习' : '官方规则'}
        </div>
      </div>
      <div style={{ textAlign: 'right', position: 'relative' }}>
        <div className="mono num" style={{ fontSize: 13, fontWeight: 600, color: s.match === 100 ? 'var(--leaf-700)' : 'var(--ink-700)', display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>{s.match}%
          <span style={{
            display: 'inline-flex', width: 14, height: 14, borderRadius: 7,
            background: 'var(--paper-2)', color: 'var(--ink-500)',
            alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 600, cursor: 'pointer', position: 'relative',
          }}
            onMouseEnter={e => {
              const tip = document.createElement('div');
              tip.id = 'match-tip';
              tip.textContent = `匹配度基于你文档的标题页结构、摘要格式、参考文献样式等特征自动计算。${s.match}% 表示高度匹配，建议选择此规范。`;
              tip.style.cssText = 'position:fixed;background:var(--ink-900);color:var(--paper-0);padding:6px 10px;border-radius:4px;font-size:10.5;line-height:1.4;font-family:var(--sans);white-space:nowrap;z-index:1000;pointer-events:none;';
              const r = e.currentTarget.getBoundingClientRect();
              tip.style.left = (r.left - 80) + 'px';
              tip.style.top = (r.bottom + 6) + 'px';
              document.body.appendChild(tip);
            }}
            onMouseLeave={() => { const t = document.getElementById('match-tip'); if (t) t.remove(); }}
          >ⓘ</span>
        </div>
        <div style={{ fontSize: 10, color: 'var(--ink-400)', letterSpacing: '.04em' }}>规则覆盖</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
        {s.sourceType === 'learned' ? <span className="chip sun">学习规则</span> : <span className="chip leaf">官方规则</span>}
        {effectiveFromLabel && <span className="mono" style={{ fontSize: 9.5, color: 'var(--ink-400)' }}>{effectiveFromLabel}</span>}
      </div>
      {selected && <Icon name="check" size={16} color="var(--brand-700)" />}
    </button>
  );
};
