import React from 'react';

export interface StructItemEx {
  k: string;
  key: string;
  conf: number | null;
  done: boolean;
  preview: string[];
}

interface StructPanelProps {
  item: StructItemEx;
  open: boolean;
  onToggle: () => void;
  active?: boolean;
  timingText?: string | null;
}

export const StructPanel: React.FC<StructPanelProps> = ({
  item, open, onToggle, active = false, timingText = null,
}) => {
  const low = item.conf !== null && item.conf < 0.85;
  return (
    <div style={{
      borderBottom: '1px solid var(--hair)',
      fontSize: 13,
      opacity: item.done || active ? 1 : .35,
      transition: 'opacity .35s, transform .35s',
      transform: active ? 'translateX(2px)' : 'none',
    }} className={!item.done && !active ? 'skeleton-pulse' : ''}>
      <button onClick={onToggle} style={{
        display: 'flex', alignItems: 'center', padding: '11px 14px',
        width: '100%', border: 'none', background: open ? 'var(--paper-1)' : active ? 'linear-gradient(90deg, rgba(220,229,238,.42), rgba(251,250,246,0))' : 'transparent',
        cursor: item.done ? 'pointer' : 'default', fontFamily: 'var(--sans)',
        textAlign: 'left',
        transition: 'background .15s',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {active && !item.done && <span className="parse-row-sheen" />}
        <span style={{
          width: 14, height: 14, borderRadius: 7, marginRight: 10,
          border: item.done ? 'none' : active ? '1.4px solid var(--brand-500)' : '1.4px solid var(--ink-300)',
          background: item.done ? (low ? 'var(--sun-100)' : 'var(--leaf-100)') : active ? 'rgba(59,92,130,.16)' : 'transparent',
          color: low ? 'var(--sun-700)' : active ? 'var(--brand-700)' : 'var(--leaf-700)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700,
          flex: '0 0 auto',
          boxShadow: active ? '0 0 0 4px rgba(30,58,95,.06)' : 'none',
        }}>{item.done ? (low ? '!' : '✓') : active ? '…' : ''}</span>
        <div style={{ flex: 1, color: 'var(--ink-900)' }}>{item.k}</div>
        {item.done && (
          <span style={{
            transform: open ? 'rotate(90deg)' : 'rotate(0)',
            transition: 'transform .15s',
            color: 'var(--ink-400)', fontFamily: 'var(--mono)', fontSize: 12,
            marginRight: 8,
          }}>›</span>
        )}
        <div style={{
          width: 110, height: 4, background: 'var(--paper-2)', borderRadius: 2,
          marginRight: 12, overflow: 'hidden', position: 'relative', flex: '0 0 auto',
        }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: `${item.done ? (item.conf || 0) * 100 : active ? 56 : 0}%`,
            background: item.done ? (low ? 'var(--sun-500)' : 'var(--leaf-500)') : 'var(--brand-500)',
            transition: 'width .35s',
          }} />
          {active && !item.done && <div className="parse-meter-runner" />}
        </div>
        <div className="mono num" style={{
          width: timingText ? 72 : 40, fontSize: 11, color: item.done ? (low ? 'var(--sun-700)' : 'var(--ink-700)') : active ? 'var(--brand-700)' : 'var(--ink-400)',
          textAlign: 'right', flex: '0 0 auto',
        }}>{timingText || (item.conf !== null ? item.conf.toFixed(2) : active ? 'RUN' : '—')}</div>
      </button>
      {open && item.done && (
        <div style={{
          padding: '2px 14px 12px 38px',
          borderTop: '1px solid var(--hair)',
        }}>
          {item.preview.length > 0 ? (
            <div style={{ fontSize: 11.5, color: 'var(--ink-600)', lineHeight: 1.6 }}>
              {item.preview[0] === '（未识别到内容）' ? (
                <span style={{ color: 'var(--ink-400)', fontStyle: 'italic' }}>{item.preview[0]}</span>
              ) : (
                item.preview.map((p, i) => (
                  <div key={i} style={{
                    padding: '5px 0',
                    borderBottom: i < item.preview.length - 1 ? '1px dashed var(--hair)' : 'none',
                  }}>
                    <span className="mono" style={{ color: 'var(--ink-400)', fontSize: 9, marginRight: 6 }}>{i + 1}</span>
                    {p}
                  </div>
                ))
              )}
            </div>
          ) : (
            <span style={{ color: 'var(--ink-400)', fontStyle: 'italic', fontSize: 11.5 }}>处理中…</span>
          )}
        </div>
      )}
    </div>
  );
};
