import React from 'react';
import { Icon, LogoMark } from './Common';
import { findSchoolById, type AppState } from './AppFrame';

export const Sidebar: React.FC<{ state: AppState }> = ({ state }) => {
  const navItems = [
    { k: 'workbench', label: '工作台', icon: 'home' },
  ];
  const stepPct = (state.step - 1) / 6 * 100;
  const partialPct = state.step === 3 && !state.parseDone ? Math.min(state.parsePct, 99) / 6 : 0;
  const pct = state.step === 6 && state.exported ? 100 : Math.round(Math.min(stepPct + partialPct, 99));
  const school = findSchoolById(state.schoolId);

  return (
    <aside style={{
      background: 'var(--ink-900)', color: 'var(--paper-1)',
      display: 'flex', flexDirection: 'column',
      padding: '22px 16px 18px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28, padding: '0 4px' }}>
        <LogoMark />
        <div>
          <div className="serif" style={{ fontSize: 18, fontWeight: 600, lineHeight: 1, letterSpacing: -.2 }}>正稿</div>
          <div className="mono" style={{ fontSize: 9, color: 'rgba(255,255,255,.4)', letterSpacing: '.16em', marginTop: 3 }}>ZHENGGAO</div>
        </div>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 22 }}>
        {navItems.map(n => (
          <div key={n.k} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 10px', borderRadius: 4,
            background: n.k === 'workbench' ? 'rgba(255,255,255,.08)' : 'transparent',
            color: n.k === 'workbench' ? 'var(--paper-0)' : 'rgba(255,255,255,.62)',
            fontSize: 13.5, cursor: 'pointer',
            fontWeight: n.k === 'workbench' ? 500 : 400,
          }}>
            <Icon name={n.icon} size={15} />
            {n.label}
          </div>
        ))}
      </nav>

      {state.doc && (
        <>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: 8, padding: '0 10px' }}>当前进度</div>
          <div style={{
            padding: '10px 10px', background: 'rgba(255,255,255,.05)', borderRadius: 4,
            display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14,
          }}>
            <div style={{
              fontSize: 12, color: 'var(--paper-0)', fontWeight: 500, lineHeight: 1.3,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>{state.doc.name}</div>
            <div className="mono" style={{ fontSize: 10, color: 'rgba(255,255,255,.5)' }}>
              {school ? school.name : '浏览模式 · 仅查看结构，不进入修复'}
            </div>
            <div style={{ marginTop: 6, height: 3, background: 'rgba(255,255,255,.1)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${pct}%`, background: 'var(--rust-500)',
                transition: 'width .35s cubic-bezier(.2,.8,.2,1)',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: 9.5, color: 'rgba(255,255,255,.5)' }}>
              <span>第 {state.step} 步</span>
              <span>{Math.round(pct)}%</span>
            </div>
          </div>
        </>
      )}

      <div style={{ flex: 1 }} />

      <div style={{
        padding: '12px 12px', border: '1px solid rgba(255,255,255,.12)', borderRadius: 4,
        fontSize: 11, lineHeight: 1.5, color: 'rgba(255,255,255,.6)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--leaf-500)' }} />
          <span className="mono" style={{ fontSize: 9.5, letterSpacing: '.14em', color: 'rgba(255,255,255,.65)' }}>USER PACT</span>
        </div>
        只改格式 · 不改正文 · 让你更安心地把论文交出去
      </div>
    </aside>
  );
};
