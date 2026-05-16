import React from 'react';
import { type AppState } from './AppFrame';

export const TopBar: React.FC<{
  state: AppState;
  onStep: (s: number) => void;
  onReset: () => void;
}> = ({ state, onStep, onReset }) => {
  const steps = ['上传论文', '学校', '正在检查…', '查看修改', '确认', '下载定稿'];
  const [menuOpen, setMenuOpen] = React.useState(false);
  const headerRef = React.useRef<HTMLElement | null>(null);
  const [headerWidth, setHeaderWidth] = React.useState(1200);

  React.useEffect(() => {
    const node = headerRef.current;
    if (!node || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      setHeaderWidth(entry.contentRect.width);
    });
    observer.observe(node);
    setHeaderWidth(node.getBoundingClientRect().width);
    return () => observer.disconnect();
  }, []);

  const reachable = (index: number) => {
    if (index === 0) return true;
    if (index === 1) return !!state.doc;
    if (index === 2) return !!state.doc;
    if (index === 3) return state.parseDone;
    if (index === 4) return state.parseDone;
    if (index === 5) return state.exported;
    return false;
  };

  const avatarText = '陈';
  const compact = headerWidth < 980;
  const tight = headerWidth < 760;

  return (
    <header ref={headerRef} data-testid="topbar" style={{
      position: 'sticky',
      top: 0,
      zIndex: 120,
      minHeight: tight ? 62 : 56,
      paddingLeft: tight ? 14 : compact ? 20 : 32,
      paddingRight: tight ? 14 : compact ? 20 : 32,
      display: 'grid',
      gridTemplateColumns: tight
        ? 'minmax(48px, auto) minmax(300px, 1fr) minmax(44px, auto)'
        : compact
        ? 'minmax(92px, .7fr) minmax(330px, 1.4fr) minmax(96px, .7fr)'
        : 'minmax(150px, 1fr) minmax(440px, auto) minmax(220px, 1fr)',
      columnGap: tight ? 8 : compact ? 12 : 24,
      alignItems: 'center',
      background: 'rgba(253, 252, 250, 0.88)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      borderBottom: '1px solid var(--rule-line)',
      flex: '0 0 auto',
      overflow: 'visible',
    }}>
      <div data-testid="topbar-brand" style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        minWidth: 0,
        justifySelf: 'start',
      }}>
        <div style={{
          width: 24,
          height: 24,
          borderRadius: 6,
          background: 'var(--ink-primary)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--shadow-card)',
          flexShrink: 0,
        }}>
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M4 5.5h12M4 10h12M4 14.5h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <circle cx="14.5" cy="14.5" r="2.5" fill="currentColor" opacity=".18" />
          </svg>
        </div>
        <div style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 'var(--text-md)',
          color: 'var(--ink-text)',
          fontWeight: 600,
          letterSpacing: '.02em',
          display: tight ? 'none' : 'block',
        }}>
          案前
        </div>
      </div>

      <nav data-testid="topbar-stepper" aria-label="论文处理步骤" style={{
        justifySelf: 'center',
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        minWidth: 0,
        whiteSpace: 'nowrap',
      }}>
        {steps.map((label, index) => {
          const stepNumber = index + 1;
          const done = stepNumber < state.step;
          const active = stepNumber === state.step;
          const future = stepNumber > state.step;
          const canClick = reachable(index);

          return (
            <React.Fragment key={label}>
              {index > 0 && (
                <span style={{
                  width: tight ? 18 : compact ? 24 : 32,
                  height: 1,
                  background: 'var(--rule-line)',
                  margin: tight ? '0 3px' : compact ? '0 4px' : '0 6px',
                  flexShrink: 0,
                }} />
              )}
              <button
                type="button"
                disabled={!canClick}
                onClick={() => canClick && onStep(stepNumber)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  padding: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: tight ? 3 : 4,
                  minWidth: tight ? 30 : compact ? 32 : 36,
                  cursor: canClick ? 'pointer' : 'not-allowed',
                  opacity: canClick ? 1 : 0.58,
                }}
              >
                <span style={{
                  width: 16,
                  height: 16,
                  borderRadius: '999px',
                  border: done
                    ? '1px solid var(--ink-primary)'
                    : active
                    ? '1px solid var(--ink-primary)'
                    : '1px solid var(--ink-tertiary)',
                  background: done
                    ? 'var(--ink-primary)'
                    : active
                    ? 'var(--ink-primary)'
                    : 'transparent',
                  color: done || active ? '#fff' : 'var(--ink-tertiary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-mono)',
                  fontSize: tight ? 9 : 10,
                  fontWeight: active ? 700 : 600,
                  lineHeight: 1,
                }}>
                  {done ? '✓' : stepNumber}
                </span>
                <span style={{
                  fontSize: 'var(--text-xs)',
                  color: active ? 'var(--ink-primary)' : future ? 'var(--ink-tertiary)' : 'var(--ink-secondary)',
                  fontWeight: active ? 700 : 500,
                  lineHeight: 1,
                  transform: tight ? 'scale(.9)' : undefined,
                  transformOrigin: 'center top',
                }}>
                  {label}
                </span>
              </button>
            </React.Fragment>
          );
        })}
      </nav>

      <div data-testid="topbar-document-area" style={{
        justifySelf: 'end',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        minWidth: 0,
        maxWidth: '100%',
        position: 'relative',
      }}>
        <div data-testid="topbar-doc-name" title={state.doc?.name || '2026毕业论文.docx'} style={{
          maxWidth: tight ? 0 : compact ? 'clamp(78px, 14vw, 180px)' : 'min(260px, 22vw)',
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontSize: 'var(--text-sm)',
          color: 'var(--ink-secondary)',
          display: tight ? 'none' : 'block',
        }}>
          {state.doc?.name || '2026毕业论文.docx'}
        </div>
        <span style={{
          width: 4,
          height: 4,
          borderRadius: '999px',
          background: 'var(--ink-tertiary)',
          flexShrink: 0,
        }} />
        <div
          onMouseEnter={() => setMenuOpen(true)}
          onMouseLeave={() => setMenuOpen(false)}
          style={{ position: 'relative' }}
        >
          <button
            type="button"
            style={{
              width: 28,
              height: 28,
              borderRadius: '999px',
              border: '1px solid rgba(42,77,58,.16)',
              background: 'var(--ink-primary)',
              color: '#fff',
              fontSize: 'var(--text-sm)',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            {avatarText}
          </button>

          {menuOpen && (
            <div style={{
              position: 'absolute',
              top: 34,
              right: 0,
              width: 140,
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--rule-line)',
              background: 'rgba(253, 252, 250, 0.98)',
              boxShadow: 'var(--shadow-card-hover)',
              padding: 6,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}>
              {[
                { label: '账号' },
                { label: '帮助' },
                { label: '退出', onClick: onReset },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => item.onClick?.()}
                  style={{
                    height: 34,
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    background: 'transparent',
                    textAlign: 'left',
                    padding: '0 10px',
                    fontSize: 'var(--text-sm)',
                    color: item.label === '退出' ? 'var(--pen-red)' : 'var(--ink-secondary)',
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
