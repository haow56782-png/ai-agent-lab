import React from 'react';

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
  ariaLabel?: string;
}

const PATHS: Record<string, React.ReactNode> = {
  home:   <path d="M3 9l7-6 7 6v8a1 1 0 0 1-1 1h-3v-6h-6v6H4a1 1 0 0 1-1-1z" />,
  book:   <><path d="M3 4h6a3 3 0 0 1 3 3v10a2 2 0 0 0-2-2H3z" /><path d="M17 4h-6a3 3 0 0 0-3 3v10a2 2 0 0 1 2-2h7z" /></>,
  clock:  <><circle cx="10" cy="10" r="7" /><path d="M10 6v4l2.5 1.5" /></>,
  list:   <><path d="M6 5h11M6 10h11M6 15h11" /><circle cx="3" cy="5" r=".8" fill="currentColor" /><circle cx="3" cy="10" r=".8" fill="currentColor" /><circle cx="3" cy="15" r=".8" fill="currentColor" /></>,
  file:   <><path d="M5 2h7l4 4v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" /><path d="M12 2v4h4" /></>,
  upload: <><path d="M10 15V3M5 8l5-5 5 5M3 18h14" /></>,
  download: <><path d="M10 3v12M5 10l5 5 5-5M3 18h14" /></>,
  search: <><circle cx="9" cy="9" r="5.5" /><path d="M13 13l4 4" /></>,
  bell:   <><path d="M5 8a5 5 0 0 1 10 0v3l1.5 3h-13L5 11z" /><path d="M8 17a2 2 0 0 0 4 0" /></>,
  check:  <path d="M3 10l4 4 10-10" />,
  chevron: <path d="M5 7l5 5 5-5" />,
  plus:   <><path d="M10 4v12M4 10h12" /></>,
  diff:   <><path d="M5 3v9a3 3 0 0 0 3 3h7M15 17V8a3 3 0 0 0-3-3H5" /><path d="M3 5l2-2 2 2M17 15l-2 2-2-2" /></>,
  eye:    <><path d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z" /><circle cx="10" cy="10" r="2.5" /></>,
  warn:   <><path d="M10 3l8 14H2z" /><path d="M10 9v4M10 15.5v.5" /></>,
  sparkle: <><path d="M10 3v4M10 13v4M3 10h4M13 10h4M5.5 5.5l2.5 2.5M12 12l2.5 2.5M5.5 14.5L8 12M12 8l2.5-2.5" /></>,
};

export const Icon: React.FC<IconProps> = ({ name, size = 16, color = 'currentColor', strokeWidth = 1.5, ariaLabel }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none"
    stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
    {...(ariaLabel ? { role: 'img', 'aria-label': ariaLabel } : { 'aria-hidden': true })}>
    {PATHS[name] || null}
  </svg>
);

interface IconBtnProps {
  name: string;
  onClick?: () => void;
  badge?: boolean;
  ariaLabel?: string;
}

export const IconBtn: React.FC<IconBtnProps> = ({ name, onClick, badge, ariaLabel }) => (
  <button aria-label={ariaLabel} onClick={onClick} style={{
    width: 32, height: 32, border: 'none', background: 'transparent',
    borderRadius: 4, cursor: 'pointer', position: 'relative',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'var(--ink-500)',
  }}>
    <Icon name={name} size={16} />
    {badge && (
      <span style={{
        position: 'absolute', top: 6, right: 6, width: 6, height: 6,
        borderRadius: 3, background: 'var(--rust-500)',
      }} />
    )}
  </button>
);

interface BtnProps {
  kind?: 'primary' | 'brand' | 'ghost' | 'quiet' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
  onClick?: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  style?: React.CSSProperties;
  title?: string;
}

export const Btn: React.FC<BtnProps> = ({ kind = 'ghost', size = 'md', icon, onClick, children, disabled, style = {}, title }) => {
  const sizes: Record<string, { h: number; px: number; fs: number }> = {
    sm: { h: 28, px: 10, fs: 12 },
    md: { h: 36, px: 14, fs: 13 },
    lg: { h: 44, px: 20, fs: 14 },
  };
  const s = sizes[size];
  const styles: Record<string, React.CSSProperties> = {
    primary: { background: 'var(--ink-900)', color: 'var(--paper-0)', border: '1px solid var(--ink-900)' },
    brand:   { background: 'var(--brand-700)', color: 'var(--paper-0)', border: '1px solid var(--brand-700)' },
    ghost:   { background: 'var(--paper-0)', color: 'var(--ink-900)', border: '1px solid var(--hair-strong)' },
    quiet:   { background: 'transparent', color: 'var(--ink-700)', border: 'none' },
    danger:  { background: 'var(--rust-500)', color: 'var(--paper-0)', border: '1px solid var(--rust-500)' },
  };
  return (
    <button disabled={disabled} onClick={onClick} title={title} style={{
      ...styles[kind], ...style,
      height: s.h, padding: `0 ${s.px}px`, fontSize: s.fs,
      fontFamily: 'var(--sans)', fontWeight: 500, borderRadius: 4, cursor: disabled ? 'not-allowed' : 'pointer',
      display: 'inline-flex', alignItems: 'center', gap: 7, letterSpacing: 0,
      opacity: disabled ? 0.5 : 1,
      transition: 'opacity .15s',
    }}>
      {icon && <Icon name={icon} size={14} />}
      {children}
    </button>
  );
};

export const LogoMark: React.FC = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <rect x="2" y="6" width="24" height="20" rx="1" fill="var(--paper-0)" opacity=".08" />
    <path d="M4 8 L14 11 L24 8 L24 22 L14 25 L4 22 Z" stroke="var(--paper-0)" strokeWidth="1.2" strokeLinejoin="round" fill="none" />
    <path d="M14 11 L14 25" stroke="var(--paper-0)" strokeWidth="1" />
    <circle cx="14" cy="14" r="2.5" fill="var(--rust-500)" />
  </svg>
);

export const SpinRing: React.FC = () => (
  <div style={{
    width: 36, height: 36, borderRadius: 18,
    border: '3px solid var(--paper-2)',
    borderTopColor: 'var(--brand-700)',
    animation: 'protoSpin .8s linear infinite',
  }} />
);

export const SpinDot: React.FC = () => (
  <span style={{
    display: 'inline-block', width: 6, height: 6, borderRadius: 3,
    background: 'currentColor',
    animation: 'protoSpin .9s linear infinite',
  }} />
);

interface SegBtnProps {
  options: [string, string][];
  value: string;
  onChange: (v: string) => void;
}

export const SegBtn: React.FC<SegBtnProps> = ({ options, value, onChange }) => (
  <div style={{ display: 'flex', background: 'var(--paper-2)', borderRadius: 4, padding: 2 }}>
    {options.map(([v, l]) => (
      <button key={v} onClick={() => onChange(v)} style={{
        padding: '4px 10px', borderRadius: 3, border: 'none', cursor: 'pointer',
        background: value === v ? 'var(--paper-0)' : 'transparent',
        color: value === v ? 'var(--ink-900)' : 'var(--ink-500)',
        fontSize: 11.5, fontWeight: value === v ? 600 : 400,
        fontFamily: 'var(--sans)',
        boxShadow: value === v ? 'var(--shadow-soft)' : 'none',
        transition: 'all .15s',
      }}>{l}</button>
    ))}
  </div>
);

interface ScoreBlockProps {
  n: number | string;
  label: string;
  tone: 'leaf' | 'sun' | 'ink' | 'rust';
}

export const ScoreBlock: React.FC<ScoreBlockProps> = ({ n, label, tone }) => {
  const c = {
    leaf: ['var(--leaf-100)', 'var(--leaf-700)'],
    sun: ['var(--sun-100)', 'var(--sun-700)'],
    ink: ['var(--paper-2)', 'var(--ink-700)'],
    rust: ['var(--rust-100)', 'var(--rust-700)'],
  }[tone];
  return (
    <div style={{ flex: 1, padding: '10px 12px', background: c[0], borderRadius: 3 }}>
      <div className="mono num" style={{ fontSize: 22, fontWeight: 700, color: c[1], lineHeight: 1 }}>{n}</div>
      <div style={{ fontSize: 11, color: c[1], marginTop: 4, opacity: .8 }}>{label}</div>
    </div>
  );
};

interface ToastProps {
  text: string | null;
}

export const Toast: React.FC<ToastProps> = ({ text }) => {
  if (!text) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%',
      transform: 'translateX(-50%)',
      background: 'var(--ink-900)', color: 'var(--paper-0)',
      padding: '12px 18px', borderRadius: 4,
      fontSize: 13, fontFamily: 'var(--sans)',
      boxShadow: '0 12px 36px -8px rgba(0,0,0,.4)',
      zIndex: 1000,
      animation: 'protoFadeUp .25s ease',
    }}>{text}</div>
  );
};
