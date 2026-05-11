import React from 'react';
import { Icon, Btn } from './Common';
import type { SchoolOption } from './AppFrame';

interface DiffToolbarProps {
  noProfile: boolean;
  effectivePassed: number;
  effectiveWarn: number;
  effectiveIgnored: number;
  effectiveFailed: number;
  warnCount: number;
  passed: number;
  changeCount: number;
  viewMode: 'changes' | 'compare';
  diffMode: 'side-by-side' | 'unified';
  filterMode: string;
  school: SchoolOption | null;
  onViewModeChange: (mode: 'changes' | 'compare') => void;
  onDiffModeChange: (mode: 'side-by-side' | 'unified') => void;
  onFilterModeChange: (mode: string) => void;
}

export const DiffToolbar: React.FC<DiffToolbarProps> = ({
  noProfile, effectivePassed, effectiveWarn, effectiveIgnored, effectiveFailed,
  warnCount, passed, changeCount, viewMode, diffMode, filterMode,
  school, onViewModeChange, onDiffModeChange, onFilterModeChange,
}) => (
  <>
    <div style={{
      height: 44, padding: '0 28px', display: 'flex', alignItems: 'center', gap: 14,
      borderBottom: '1px solid var(--hair)', background: 'var(--paper-0)', flex: '0 0 auto',
    }}>
      <span className="chip brand">{noProfile ? '格式检测' : '差异预览'}</span>
      {noProfile ? (
        <span style={{ fontSize: 12, color: 'var(--ink-500)' }}>
          <span className="mono num" style={{ color: 'var(--sun-700)', fontWeight: 600 }}>{warnCount}</span> 个格式问题 ·
          <span className="mono num" style={{ color: 'var(--leaf-700)', fontWeight: 600, marginLeft: 4 }}>{passed}</span> 项检测通过
        </span>
      ) : (
        <span style={{ fontSize: 12, color: 'var(--ink-500)' }}>
          <span className="mono num" style={{ color: 'var(--leaf-700)', fontWeight: 600 }}>{effectivePassed}</span> 通过 ·
          <span className="mono num" style={{ color: 'var(--sun-700)', fontWeight: 600, marginLeft: 4 }}>{effectiveWarn}</span> 待你确认 ·
          {effectiveIgnored > 0 && <><span className="mono num" style={{ color: 'var(--ink-500)', fontWeight: 600, marginLeft: 4 }}>{effectiveIgnored}</span> 忽略 ·</>}
          <span className="mono num" style={{ color: effectiveFailed > 0 ? 'var(--rust-700)' : 'var(--ink-700)', fontWeight: 600, marginLeft: 4 }}>{effectiveFailed}</span> 失败
        </span>
      )}
      <span style={{ flex: 1 }} />
      {!noProfile && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '4px 10px', background: 'var(--leaf-100)', color: 'var(--leaf-700)',
          borderRadius: 3, fontSize: 11.5,
        }}>
          <Icon name="check" size={12} />
          ✅ 正文没被改写，你现在确认的只是排版变化
        </div>
      )}
      {noProfile && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '4px 10px', background: 'var(--sun-100)', color: 'var(--sun-700)',
          borderRadius: 3, fontSize: 11.5,
        }}>
          <Icon name="eye" size={12} />
          仅检测 · 未应用规则修改
        </div>
      )}
    </div>

    {school && !noProfile && (
      <div style={{
        padding: '6px 28px', fontSize: 12, color: 'var(--leaf-700)',
        background: 'var(--leaf-100)', borderBottom: '1px solid var(--leaf-100)',
        display: 'flex', alignItems: 'center', gap: 6, flex: '0 0 auto',
      }}>
        <Icon name="check" size={12} />
        已按《{school.name} {school.faculty} {school.version}》整理出交稿前差异
      </div>
    )}

    <div style={{
      height: 36, padding: '0 28px', display: 'flex', alignItems: 'center', gap: 4,
      borderBottom: '1px solid var(--hair)', background: 'var(--paper-0)', flex: '0 0 auto',
    }}>
      <button onClick={() => onViewModeChange('changes')} style={{
        height: 28, padding: '0 10px', border: 'none', borderRadius: 4,
        background: viewMode === 'changes' ? 'var(--ink-900)' : 'transparent',
        color: viewMode === 'changes' ? '#fff' : 'var(--ink-500)',
        cursor: 'pointer', fontSize: 12, fontWeight: viewMode === 'changes' ? 500 : 400,
        fontFamily: 'var(--sans)', display: 'flex', alignItems: 'center', gap: 6,
        transition: 'all .15s',
      }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 3h10M2 7h10M2 11h7"/>
        </svg>
        最后确认清单
        {changeCount > 0 && <span className="mono" style={{
          fontSize: 10, opacity: .7, marginLeft: 2,
        }}>({changeCount})</span>}
      </button>
      <button onClick={() => onViewModeChange('compare')} style={{
        height: 28, padding: '0 10px', border: 'none', borderRadius: 4,
        background: viewMode === 'compare' ? 'var(--ink-900)' : 'transparent',
        color: viewMode === 'compare' ? '#fff' : 'var(--ink-500)',
        cursor: 'pointer', fontSize: 12, fontWeight: viewMode === 'compare' ? 500 : 400,
        fontFamily: 'var(--sans)', display: 'flex', alignItems: 'center', gap: 6,
        transition: 'all .15s',
      }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1.5" y="1.5" width="4.5" height="4.5" rx=".5"/><rect x="8" y="1.5" width="4.5" height="4.5" rx=".5"/><rect x="1.5" y="8" width="4.5" height="4.5" rx=".5"/><rect x="8" y="8" width="4.5" height="4.5" rx=".5"/>
        </svg>
        纸面对照
      </button>
      <span style={{ flex: 1 }} />
      {viewMode === 'compare' && (
        <div style={{ display: 'flex', gap: 6 }}>
          <Btn kind="ghost" size="sm" onClick={() => onDiffModeChange(diffMode === 'side-by-side' ? 'unified' : 'side-by-side')}
            style={diffMode === 'unified' ? { background: 'var(--ink-900)', color: 'var(--paper-0)' } : {}}>
            {diffMode === 'side-by-side' ? '切到并排视图' : '切到合并视图'}
          </Btn>
          <button onClick={() => onFilterModeChange(filterMode === 'changed' ? 'all' : 'changed')}
            style={{
              height: 26, padding: '0 8px', border: `1px solid ${filterMode === 'changed' ? 'var(--brand-700)' : 'var(--hair-strong)'}`,
              borderRadius: 4, cursor: 'pointer', fontSize: 10.5,
              background: filterMode === 'changed' ? 'var(--brand-50)' : 'transparent',
              color: filterMode === 'changed' ? 'var(--brand-700)' : 'var(--ink-500)',
              fontFamily: 'var(--sans)', display: 'flex', alignItems: 'center', gap: 4,
              transition: 'all .1s',
            }}>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 2l3 3.5v4l2 1.5v-5.5L10 2"/>
            </svg>
            {filterMode === 'changed' ? '查看全部页' : '只看有变化的页'}
          </button>
        </div>
      )}
    </div>
  </>
);
