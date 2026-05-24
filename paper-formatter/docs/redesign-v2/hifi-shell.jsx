/* global React */
// hifi-shell.jsx — Hi-fi UI primitives & app chrome for 正稿 Zhenggao
// All hi-fi screens share this chrome (sidebar, top bar, doc thumbnails).

const HF = {};

// ── App chrome ──────────────────────────────────────────────
HF.AppFrame = function AppFrame({ active = 'workbench', children, docName, stage }) {
  const navItems = [
    { k: 'workbench', label: '工作台', icon: 'home' },
    { k: 'profile',   label: '学校规范', icon: 'book' },
    { k: 'history',   label: '历史任务', icon: 'clock' },
    { k: 'rules',     label: '规则库',   icon: 'list' },
  ];
  return (
    <div className="ab" style={{
      width: '100%', height: '100%',
      background: 'var(--paper-1)',
      display: 'grid',
      gridTemplateColumns: '212px 1fr',
      overflow: 'hidden',
    }}>
      {/* SIDEBAR */}
      <aside style={{
        background: 'var(--ink-900)',
        color: 'var(--paper-1)',
        display: 'flex', flexDirection: 'column',
        padding: '22px 16px 18px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28, padding: '0 4px' }}>
          <HF.LogoMark />
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
              background: active === n.k ? 'rgba(255,255,255,.08)' : 'transparent',
              color: active === n.k ? 'var(--paper-0)' : 'rgba(255,255,255,.62)',
              fontSize: 13.5, cursor: 'pointer',
              fontWeight: active === n.k ? 500 : 400,
            }}>
              <HF.Icon name={n.icon} size={15} />
              {n.label}
            </div>
          ))}
        </nav>

        <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: 8, padding: '0 10px' }}>正在进行</div>
        <div style={{
          padding: '10px 10px', background: 'rgba(255,255,255,.05)', borderRadius: 4,
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          <div style={{ fontSize: 12, color: 'var(--paper-0)', fontWeight: 500, lineHeight: 1.3 }}>{docName || '基于深度学习的图像超分辨率重建研究.docx'}</div>
          <div className="mono" style={{ fontSize: 10, color: 'rgba(255,255,255,.5)' }}>
            清华大学 · 计算机系 · v2024.09
          </div>
          {stage && (
            <div style={{ marginTop: 6, height: 3, background: 'rgba(255,255,255,.1)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${stage}%`, background: 'var(--rust-500)' }} />
            </div>
          )}
        </div>

        <div style={{ flex: 1 }} />

        {/* user pact pill at bottom */}
        <div style={{
          padding: '12px 12px',
          border: '1px solid rgba(255,255,255,.12)',
          borderRadius: 4,
          fontSize: 11, lineHeight: 1.5,
          color: 'rgba(255,255,255,.6)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--leaf-500)' }} />
            <span className="mono" style={{ fontSize: 9.5, letterSpacing: '.14em', color: 'rgba(255,255,255,.65)' }}>USER PACT</span>
          </div>
          只改格式 · 不改内容 · 输出可回退
        </div>
      </aside>

      {/* MAIN */}
      <main style={{
        background: 'var(--paper-1)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {children}
      </main>
    </div>
  );
};

// ── Top bar w/ stepper ──────────────────────────────────────
HF.TopBar = function TopBar({ step = 1, docName, school, version }) {
  const steps = ['上传', '规范', '解析', '差异', '导出'];
  return (
    <header style={{
      height: 56, padding: '0 28px',
      display: 'flex', alignItems: 'center', gap: 22,
      borderBottom: '1px solid var(--hair)',
      background: 'var(--paper-0)',
      flex: '0 0 auto',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '0 0 auto' }}>
        <HF.Icon name="file" size={16} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-900)', lineHeight: 1.1 }}>
            {docName || '深度学习图像超分辨率重建研究.docx'}
          </div>
          <div className="mono" style={{ fontSize: 10, color: 'var(--ink-500)', marginTop: 2 }}>
            {school || '清华大学 · 计算机系'} · 规则版 {version || 'v2024.09'}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {steps.map((s, i) => (
            <React.Fragment key={s}>
              {i > 0 && <span style={{ width: 16, height: 1, background: i <= step - 1 ? 'var(--ink-700)' : 'var(--hair-strong)' }} />}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  width: 18, height: 18, borderRadius: 9,
                  border: `1.4px solid ${i <= step - 1 ? 'var(--ink-900)' : 'var(--ink-300)'}`,
                  background: i < step - 1 ? 'var(--ink-900)' : i === step - 1 ? 'var(--brand-700)' : 'transparent',
                  color: i <= step - 1 ? 'var(--paper-0)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 600, fontFamily: 'var(--mono)',
                }}>{i < step - 1 ? '✓' : i + 1}</span>
                <span style={{
                  fontSize: 12, color: i === step - 1 ? 'var(--ink-900)' : 'var(--ink-500)',
                  fontWeight: i === step - 1 ? 600 : 400,
                }}>{s}</span>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <HF.IconBtn name="search" />
        <HF.IconBtn name="bell" />
        <div style={{
          width: 32, height: 32, borderRadius: 16,
          background: 'var(--brand-700)', color: 'var(--paper-0)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 600,
        }}>陈</div>
      </div>
    </header>
  );
};

// ── Logo mark — a small open book + nib ─────────────────────
HF.LogoMark = function LogoMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect x="2" y="6" width="24" height="20" rx="1" fill="var(--paper-0)" opacity=".08"/>
      <path d="M4 8 L14 11 L24 8 L24 22 L14 25 L4 22 Z" stroke="var(--paper-0)" strokeWidth="1.2" strokeLinejoin="round" fill="none"/>
      <path d="M14 11 L14 25" stroke="var(--paper-0)" strokeWidth="1" />
      <circle cx="14" cy="14" r="2.5" fill="var(--rust-500)"/>
    </svg>
  );
};

// ── Icons ───────────────────────────────────────────────────
HF.Icon = function Icon({ name, size = 16, color = 'currentColor', strokeWidth = 1.5 }) {
  const p = {
    home:   <path d="M3 9l7-6 7 6v8a1 1 0 0 1-1 1h-3v-6h-6v6H4a1 1 0 0 1-1-1z"/>,
    book:   <><path d="M3 4h6a3 3 0 0 1 3 3v10a2 2 0 0 0-2-2H3z"/><path d="M17 4h-6a3 3 0 0 0-3 3v10a2 2 0 0 1 2-2h7z"/></>,
    clock:  <><circle cx="10" cy="10" r="7"/><path d="M10 6v4l2.5 1.5"/></>,
    list:   <><path d="M6 5h11M6 10h11M6 15h11"/><circle cx="3" cy="5" r=".8" fill={color}/><circle cx="3" cy="10" r=".8" fill={color}/><circle cx="3" cy="15" r=".8" fill={color}/></>,
    file:   <><path d="M5 2h7l4 4v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"/><path d="M12 2v4h4"/></>,
    upload: <><path d="M10 15V3M5 8l5-5 5 5M3 18h14"/></>,
    download:<><path d="M10 3v12M5 10l5 5 5-5M3 18h14"/></>,
    search: <><circle cx="9" cy="9" r="5.5"/><path d="M13 13l4 4"/></>,
    bell:   <><path d="M5 8a5 5 0 0 1 10 0v3l1.5 3h-13L5 11z"/><path d="M8 17a2 2 0 0 0 4 0"/></>,
    check:  <path d="M3 10l4 4 10-10"/>,
    chevron:<path d="M5 7l5 5 5-5"/>,
    plus:   <><path d="M10 4v12M4 10h12"/></>,
    diff:   <><path d="M5 3v9a3 3 0 0 0 3 3h7M15 17V8a3 3 0 0 0-3-3H5"/><path d="M3 5l2-2 2 2M17 15l-2 2-2-2"/></>,
    eye:    <><path d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z"/><circle cx="10" cy="10" r="2.5"/></>,
    warn:   <><path d="M10 3l8 14H2z"/><path d="M10 9v4M10 15.5v.5"/></>,
    info:   <><circle cx="10" cy="10" r="7"/><path d="M10 9v5M10 6.5v.5"/></>,
    sparkle:<><path d="M10 3v4M10 13v4M3 10h4M13 10h4M5.5 5.5l2.5 2.5M12 12l2.5 2.5M5.5 14.5L8 12M12 8l2.5-2.5"/></>,
    grid:   <><rect x="3" y="3" width="6" height="6"/><rect x="11" y="3" width="6" height="6"/><rect x="3" y="11" width="6" height="6"/><rect x="11" y="11" width="6" height="6"/></>,
    sliders:<><path d="M4 6h12M4 14h12"/><circle cx="8" cy="6" r="2" fill="var(--paper-0)"/><circle cx="13" cy="14" r="2" fill="var(--paper-0)"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {p[name] || null}
    </svg>
  );
};

HF.IconBtn = function IconBtn({ name, onClick, badge }) {
  return (
    <button onClick={onClick} style={{
      width: 32, height: 32, border: 'none', background: 'transparent',
      borderRadius: 4, cursor: 'pointer', position: 'relative',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'var(--ink-500)',
    }}>
      <HF.Icon name={name} size={16} />
      {badge && (
        <span style={{
          position: 'absolute', top: 6, right: 6, width: 6, height: 6,
          borderRadius: 3, background: 'var(--rust-500)',
        }} />
      )}
    </button>
  );
};

// ── Button ──────────────────────────────────────────────────
HF.Btn = function Btn({ kind = 'ghost', children, icon, onClick, size = 'md' }) {
  const sizes = {
    sm: { h: 28, px: 10, fs: 12 },
    md: { h: 36, px: 14, fs: 13 },
    lg: { h: 44, px: 20, fs: 14 },
  }[size];
  const styles = {
    primary: { background: 'var(--ink-900)', color: 'var(--paper-0)', border: '1px solid var(--ink-900)' },
    brand:   { background: 'var(--brand-700)', color: 'var(--paper-0)', border: '1px solid var(--brand-700)' },
    ghost:   { background: 'var(--paper-0)', color: 'var(--ink-900)', border: '1px solid var(--hair-strong)' },
    quiet:   { background: 'transparent', color: 'var(--ink-700)', border: 'none' },
    danger:  { background: 'var(--rust-500)', color: 'var(--paper-0)', border: '1px solid var(--rust-500)' },
  }[kind];
  return (
    <button onClick={onClick} style={{
      ...styles, ...{ height: sizes.h, padding: `0 ${sizes.px}px`, fontSize: sizes.fs,
        fontFamily: 'var(--sans)', fontWeight: 500, borderRadius: 4, cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', gap: 7, letterSpacing: 0,
      },
    }}>
      {icon && <HF.Icon name={icon} size={14} />}
      {children}
    </button>
  );
};

window.HF = HF;
