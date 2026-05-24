/* global React, HF */
// redesign-step4.jsx — Step 4: 红笔工坊 Red-pen Repair Workbench
// Improvements over current Step4Fix:
//  • LEFT: manuscript map — minimap of all pages with finding dots
//  • CENTER: paper with red-pen cursor + redline annotation
//  • RIGHT: current finding card w/ inline 批准 / 存疑 / 跳过
//  • BOTTOM: scrubbable timeline showing all findings as a sequence

function RedesignStep4() {
  return (
    <div className="ab" style={{
      width: '100%', height: '100%',
      background: 'var(--paper-1)', display: 'grid',
      gridTemplateColumns: '212px 1fr', overflow: 'hidden',
    }}>
      <S4Sidebar />
      <main style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <S4TopBar />
        <S4SubBar />
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '116px 1fr 320px', overflow: 'hidden' }}>
          <ManuscriptMap />
          <PaperWithRedPen />
          <FindingCockpit />
        </div>
        <FindingsTimeline />
      </main>
    </div>
  );
}

function S4Sidebar() {
  return (
    <aside style={{
      background: 'var(--ink-900)', color: 'var(--paper-1)',
      display: 'flex', flexDirection: 'column', padding: '22px 16px 18px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28, padding: '0 4px' }}>
        <HF.LogoMark />
        <div>
          <div className="serif" style={{ fontSize: 18, fontWeight: 600, lineHeight: 1 }}>正稿</div>
          <div className="mono" style={{ fontSize: 9, color: 'rgba(255,255,255,.4)', letterSpacing: '.16em', marginTop: 3 }}>ZHENGGAO</div>
        </div>
      </div>

      <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: 8, padding: '0 10px' }}>修复会话</div>
      <div style={{ padding: '10px 10px', background: 'rgba(255,255,255,.05)', borderRadius: 4, marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: 'var(--paper-0)', fontWeight: 500, lineHeight: 1.3, marginBottom: 6 }}>p0-basic-thesis.docx</div>
        <div className="mono" style={{ fontSize: 10, color: 'rgba(255,255,255,.5)', marginBottom: 8 }}>中国科学技术大学 · vAuto</div>
        <div style={{ height: 3, background: 'rgba(255,255,255,.1)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: '40%', background: 'var(--rust-500)' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontFamily: 'var(--mono)', fontSize: 9.5, color: 'rgba(255,255,255,.5)' }}>
          <span>修复 2 / 5</span><span>40%</span>
        </div>
      </div>

      {/* finding categories */}
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: 8, padding: '0 10px' }}>本次修复</div>
      {[
        ['页面 / 版心', 2, 'var(--brand-500)'],
        ['标题 / 段落', 5, 'var(--brand-500)'],
        ['图题 / 表题', 4, 'var(--rust-500)'],
        ['页码 / 分节', 2, 'var(--brand-500)'],
        ['参考文献',    3, 'var(--sun-500)'],
      ].map(([k, n, c]) => (
        <div key={k} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 10px', fontSize: 11.5, color: 'rgba(255,255,255,.78)',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: 3, background: c }} />
          <span style={{ flex: 1 }}>{k}</span>
          <span className="mono num" style={{ color: 'rgba(255,255,255,.55)' }}>{n}</span>
        </div>
      ))}

      <div style={{ flex: 1 }} />

      <div style={{
        padding: '12px 12px', border: '1px solid rgba(255,255,255,.12)', borderRadius: 4,
        fontSize: 11, lineHeight: 1.5, color: 'rgba(255,255,255,.6)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--rust-500)' }} />
          <span className="mono" style={{ fontSize: 9.5, letterSpacing: '.14em', color: 'rgba(255,255,255,.65)' }}>WHITELIST</span>
        </div>
        只改格式属性 · 不动正文文字 · 出错即停
      </div>
    </aside>
  );
}

function S4TopBar() {
  const steps = ['上传', '学校', '体检', '修复', '确认', '下载'];
  const current = 3;
  return (
    <header style={{
      height: 56, padding: '0 28px', display: 'flex', alignItems: 'center', gap: 22,
      borderBottom: '1px solid var(--hair)', background: 'var(--paper-0)', flex: '0 0 auto',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <HF.Icon name="file" size={16} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-900)' }}>p0-basic-thesis.docx</div>
          <div className="mono" style={{ fontSize: 10, color: 'var(--ink-500)', marginTop: 2 }}>中国科学技术大学 · vAuto</div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {steps.map((s, i) => {
            const active = i === current;
            const done = i < current;
            return (
              <React.Fragment key={s}>
                {i > 0 && <span style={{ width: 16, height: 1, background: i <= current ? 'var(--ink-700)' : 'var(--hair-strong)' }} />}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    width: 18, height: 18, borderRadius: 9,
                    border: `1.4px solid ${active || done ? 'var(--ink-900)' : 'var(--ink-300)'}`,
                    background: done ? 'var(--ink-900)' : active ? 'var(--brand-700)' : 'transparent',
                    color: done || active ? 'var(--paper-0)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 600, fontFamily: 'var(--mono)',
                  }}>{done ? '✓' : i + 1}</span>
                  <span style={{ fontSize: 12, color: active ? 'var(--ink-900)' : 'var(--ink-500)', fontWeight: active ? 600 : 400 }}>{s}</span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <HF.IconBtn name="search" />
        <div style={{
          width: 32, height: 32, borderRadius: 16,
          background: 'var(--brand-700)', color: 'var(--paper-0)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 600,
        }}>陈</div>
      </div>
    </header>
  );
}

// ───────── Sub-bar: playback controls + speed + skip ─────────
function S4SubBar() {
  return (
    <div style={{
      height: 48, padding: '0 28px', display: 'flex', alignItems: 'center', gap: 14,
      borderBottom: '1px solid var(--hair)', background: 'var(--paper-0)', flex: '0 0 auto',
    }}>
      <span className="chip" style={{ background: 'var(--rust-100)', color: 'var(--rust-700)' }}>红笔工坊 · 修复中</span>
      <div style={{ fontSize: 12.5, color: 'var(--ink-700)' }}>
        当前发现 · <span style={{ fontWeight: 600, color: 'var(--ink-900)' }}>正文字体槽 宋体/Times</span>
      </div>
      <div style={{
        height: 18, padding: '0 8px', borderRadius: 2,
        display: 'flex', alignItems: 'center',
        background: 'var(--paper-2)', fontFamily: 'var(--mono)',
        fontSize: 10, color: 'var(--ink-500)',
      }}>证据位置 · 第 1 页 · §1.1 · 段落 3</div>

      <span style={{ flex: 1 }} />

      {/* Playback transport */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <TransportBtn glyph="«" hint="上一项" />
        <TransportBtn glyph="‖" hint="暂停" active />
        <TransportBtn glyph="»" hint="下一项" />
      </div>
      <SegBtn options={[['1', '1x'], ['2', '2x'], ['4', '4x']]} value="2" />
      <HF.Btn kind="ghost" size="sm">跳到完成</HF.Btn>
      <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-400)', letterSpacing: '.06em' }}>剩余 23s</span>
    </div>
  );
}

function TransportBtn({ glyph, hint, active }) {
  return (
    <button title={hint} style={{
      width: 30, height: 30, borderRadius: 4,
      border: '1px solid var(--hair-strong)',
      background: active ? 'var(--ink-900)' : 'var(--paper-0)',
      color: active ? 'var(--paper-0)' : 'var(--ink-700)',
      cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 600,
    }}>{glyph}</button>
  );
}

function SegBtn({ options, value }) {
  return (
    <div style={{ display: 'flex', background: 'var(--paper-2)', borderRadius: 4, padding: 2 }}>
      {options.map(([v, l]) => (
        <button key={v} style={{
          padding: '4px 10px', borderRadius: 3, border: 'none', cursor: 'pointer',
          background: value === v ? 'var(--paper-0)' : 'transparent',
          color: value === v ? 'var(--ink-900)' : 'var(--ink-500)',
          fontSize: 11, fontWeight: value === v ? 600 : 400,
          fontFamily: 'var(--mono)',
          boxShadow: value === v ? 'var(--shadow-soft)' : 'none',
        }}>{l}</button>
      ))}
    </div>
  );
}

// ───────── Left: manuscript map (minimap with finding dots) ─────────
function ManuscriptMap() {
  // 6 visible pages, each with a few finding dots
  const pages = [
    { p: 1,    dots: [{ y: 22, c: 'rust' }, { y: 52, c: 'rust', cur: true }, { y: 78, c: 'sun' }] },
    { p: 2,    dots: [{ y: 36, c: 'rust' }] },
    { p: 3,    dots: [{ y: 14, c: 'rust' }, { y: 58, c: 'rust' }] },
    { p: 5,    dots: [{ y: 30, c: 'rust' }, { y: 72, c: 'rust' }] },
    { p: 7,    dots: [{ y: 50, c: 'rust' }] },
    { p: 12,   dots: [{ y: 26, c: 'sun' }, { y: 64, c: 'sun' }] },
  ];
  return (
    <aside style={{
      background: 'var(--paper-0)', borderRight: '1px solid var(--hair)',
      padding: '12px 0 12px', display: 'flex', flexDirection: 'column', overflow: 'auto',
    }}>
      <div style={{ padding: '0 12px 10px' }}>
        <div className="mono" style={{ fontSize: 9.5, letterSpacing: '.14em', color: 'var(--ink-400)' }}>稿纸地图</div>
        <div style={{ fontSize: 11, color: 'var(--ink-500)', lineHeight: 1.45, marginTop: 4 }}>14 个发现 · 分布于 6 页</div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, padding: '0 14px' }}>
        {pages.map((pg, i) => (
          <div key={i} style={{ position: 'relative', cursor: 'pointer' }}>
            <div style={{
              height: 110, background: '#fff',
              border: `1.4px solid ${pg.p === 1 ? 'var(--rust-500)' : 'var(--hair-strong)'}`,
              outline: pg.p === 1 ? '2px solid rgba(184,84,47,.2)' : 'none',
              padding: '8px 8px',
              display: 'flex', flexDirection: 'column', gap: 3,
              position: 'relative',
            }}>
              {Array.from({ length: 9 }).map((_, j) => (
                <div key={j} style={{
                  height: 1.5, background: 'var(--paper-3)',
                  width: ['90%', '75%', '95%', '60%'][j % 4],
                }} />
              ))}
              {/* dots */}
              {pg.dots.map((d, k) => (
                <span key={k} style={{
                  position: 'absolute',
                  top: `${d.y}%`, right: 5,
                  width: d.cur ? 8 : 6, height: d.cur ? 8 : 6,
                  borderRadius: '50%',
                  background: d.c === 'rust' ? 'var(--rust-500)' : 'var(--sun-500)',
                  boxShadow: d.cur ? '0 0 0 2px rgba(184,84,47,.25)' : 'none',
                }} />
              ))}
            </div>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 10,
              color: pg.p === 1 ? 'var(--ink-900)' : 'var(--ink-500)',
              fontWeight: pg.p === 1 ? 600 : 400,
              textAlign: 'center', marginTop: 4,
            }}>p.{pg.p}</div>
          </div>
        ))}
      </div>

      <div style={{
        padding: '10px 14px', borderTop: '1px solid var(--hair)', marginTop: 8,
        display: 'flex', flexDirection: 'column', gap: 4,
      }}>
        {[
          ['rust', '已修复', 8],
          ['active', '本次焦点', 1],
          ['sun', '建议', 3],
          ['pend', '未触及', 2],
        ].map(([c, k, n]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, color: 'var(--ink-500)' }}>
            <span style={{
              width: 6, height: 6, borderRadius: 3,
              background:
                c === 'rust' ? 'var(--rust-500)' :
                c === 'active' ? 'var(--rust-700)' :
                c === 'sun' ? 'var(--sun-500)' : 'var(--ink-300)',
              boxShadow: c === 'active' ? '0 0 0 2px rgba(184,84,47,.2)' : 'none',
            }} />
            <span style={{ flex: 1 }}>{k}</span>
            <span className="mono num">{n}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}

// ───────── Center: paper with red-pen cursor + redline mark ─────────
function PaperWithRedPen() {
  return (
    <div style={{
      background: 'var(--paper-1)', padding: '24px 28px', overflow: 'hidden',
      position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
    }}>
      <div style={{
        width: 460, height: '100%', maxHeight: 640,
        background: '#fff',
        boxShadow: '0 24px 60px -16px rgba(0,0,0,.2)',
        position: 'relative', overflow: 'hidden',
        padding: '36px 44px 28px',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <div className="serif" style={{ fontSize: 9.5, color: 'var(--ink-400)' }}>本科毕业论文</div>
          <div className="serif" style={{ fontSize: 17, fontWeight: 600, color: 'var(--ink-900)', marginTop: 4 }}>p0-basic-thesis</div>
        </div>

        {/* H1 — being centered + struck-through old style note */}
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <div className="serif" style={{
            fontSize: 14, fontWeight: 600, color: 'var(--ink-900)',
            textAlign: 'center', padding: '4px 0',
            background: 'rgba(184,84,47,.07)',
          }}>
            第一节 标题（小三黑体）
          </div>
          <div style={{
            position: 'absolute', left: -8, top: -2, bottom: -2, width: 2,
            background: 'var(--rust-500)',
          }} />
          {/* red strikethrough note above */}
          <div style={{
            position: 'absolute', left: 0, right: 0, top: -16,
            textAlign: 'center', fontFamily: 'var(--serif)', fontSize: 9.5,
            color: 'var(--rust-700)', fontStyle: 'italic',
          }}>
            <span style={{ textDecoration: 'line-through' }}>格式修</span>正<span style={{ textDecoration: 'line-through' }}>稿</span>式修正
          </div>
        </div>

        {/* body line — being changed (font slot) */}
        <div style={{ position: 'relative', marginBottom: 8 }}>
          <div className="serif" style={{ fontSize: 11, color: 'var(--ink-900)', lineHeight: 1.7 }}>
            <span style={{ fontFamily: '"Source Serif 4", serif' }}>正文段落 1</span>
          </div>
          <div style={{
            fontSize: 9, color: 'var(--rust-700)', fontFamily: 'var(--mono)',
            marginLeft: 0, marginTop: -2,
          }}>正文格式</div>
        </div>

        {/* body line — about to change with red strikethrough */}
        <div style={{ position: 'relative', marginBottom: 10, padding: '4px 0', background: 'rgba(184,84,47,.07)' }}>
          <div className="serif" style={{
            fontSize: 11, color: 'var(--ink-900)', lineHeight: 1.7,
            textDecoration: 'line-through', textDecorationColor: 'var(--rust-500)',
            textDecorationThickness: '1.5px',
          }}>中国科学技术大学</div>
          <div style={{
            position: 'absolute', left: -8, top: 0, bottom: 0, width: 2,
            background: 'var(--rust-500)',
          }} />
        </div>

        <div className="serif" style={{ fontSize: 11, color: 'var(--ink-900)', lineHeight: 1.7, marginBottom: 14 }}>
          本科毕业论文
        </div>

        {/* figure */}
        <div style={{
          height: 70, background: 'var(--paper-2)', border: '1px solid var(--hair)',
          marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="120" height="40" viewBox="0 0 120 40">
            {[6, 22, 38, 54, 70, 86, 102].map((x, i) => (
              <rect key={i} x={x} y={6 + i * 1.5} width="10" height={26 + i * 1.5} fill="var(--brand-500)" opacity={.2 + i * .1} />
            ))}
          </svg>
        </div>
        <div className="serif" style={{ fontSize: 9.5, color: 'var(--ink-700)', textAlign: 'center', fontStyle: 'italic', marginBottom: 14 }}>
          图 1-2 论文版式校对流程示意
        </div>

        <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, textAlign: 'center', fontFamily: 'var(--serif)', fontSize: 9.5, color: 'var(--ink-400)' }}>
          1
        </div>

        {/* RED PEN CURSOR overlay — pointing at the strikethrough line */}
        <div style={{
          position: 'absolute', left: 100, top: 145,
          pointerEvents: 'none',
        }}>
          <svg width="44" height="44" viewBox="0 0 44 44">
            <g transform="rotate(35 10 10)">
              <rect x="8" y="0" width="3" height="22" fill="#9C4421" />
              <polygon points="6.5,22 11.5,22 9,30" fill="#15171B" />
              <rect x="7.5" y="-2" width="4" height="3" fill="#15171B" />
            </g>
            <circle cx="11" cy="32" r="1.6" fill="#9C4421" />
            <circle cx="13" cy="36" r="1.2" fill="#9C4421" opacity=".6" />
          </svg>
        </div>

        {/* annotation callout to right of pen */}
        <div style={{
          position: 'absolute', left: 152, top: 142, maxWidth: 140,
          fontSize: 9.5, color: 'var(--rust-700)', fontFamily: 'var(--mono)',
          lineHeight: 1.45, letterSpacing: '.02em',
        }}>
          <div style={{ position: 'absolute', left: -12, top: 6, width: 10, height: 1, background: 'var(--rust-500)' }} />
          正文字体槽<br/>
          宋体 / Times<br/>
          段前 → 标准
        </div>
      </div>

      {/* Stage label below */}
      <div style={{
        position: 'absolute', bottom: 14, left: 0, right: 0,
        textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 10,
        color: 'var(--ink-500)', letterSpacing: '.14em',
      }}>
        FIX 2 / 5 · 当前发现 · P2 发现 · 正文字体槽
      </div>
    </div>
  );
}

// ───────── Right: current finding cockpit ─────────
function FindingCockpit() {
  return (
    <aside style={{
      background: 'var(--paper-0)', borderLeft: '1px solid var(--hair)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <div style={{ padding: '14px 18px 10px', borderBottom: '1px solid var(--hair)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
          <span className="serif" style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-900)' }}>当前发现项 · 2 / 5</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-500)' }}>系统正在动手；右侧三键随时接管</div>
      </div>

      {/* finding card */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--hair)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{
            fontSize: 10, padding: '2px 6px', borderRadius: 2,
            background: 'var(--rust-100)', color: 'var(--rust-700)', fontWeight: 600,
          }}>正在修复</span>
          <span className="mono" style={{ fontSize: 10, color: 'var(--ink-400)' }}>00:10 · p.1</span>
          <span style={{ flex: 1 }} />
          <span className="mono" style={{ fontSize: 10, color: 'var(--ink-400)' }}>F-0237</span>
        </div>
        <div className="serif" style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink-900)', marginBottom: 8, letterSpacing: -.2 }}>
          正文字体槽 宋体 / Times
        </div>

        {/* evidence triplet */}
        <div style={{
          background: 'var(--paper-1)', borderRadius: 4,
          padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6,
          marginBottom: 12,
        }}>
          <Triplet label="证据" tone="ink" body={<><span className="mono">para[3]</span> · 字符样式 <span className="mono">SimSun + Arial</span> · 字号 10.5pt</>} />
          <Triplet label="规则" tone="brand" body={<>学校规则 <span className="mono">vAuto · body_fonts</span> · 正文应为 <span className="mono">宋体 / Times New Roman</span></>} />
          <Triplet label="修改" tone="rust" body={<>替换字体槽 · 字号保持不变 · 影响段落 <span className="mono">3 / 87</span></>} />
        </div>

        {/* inline ops */}
        <div style={{ display: 'flex', gap: 6 }}>
          <HF.Btn kind="primary" size="sm">✓ 批准</HF.Btn>
          <HF.Btn kind="ghost" size="sm">⌥ 存疑</HF.Btn>
          <HF.Btn kind="quiet" size="sm">跳过</HF.Btn>
          <span style={{ flex: 1 }} />
          <button style={{
            border: 'none', background: 'transparent', fontSize: 11, color: 'var(--brand-700)',
            cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3,
          }}>查看规则原文 →</button>
        </div>
      </div>

      {/* upcoming queue */}
      <div style={{ padding: '12px 18px 4px', borderBottom: '1px solid var(--hair)' }}>
        <div className="mono" style={{ fontSize: 9.5, color: 'var(--ink-400)', letterSpacing: '.14em', marginBottom: 8 }}>即将处理</div>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '6px 14px' }}>
        {[
          { t: '页边距', sub: '上 20 → 25mm', p: 'p.1', sev: 'rule' },
          { t: '图 1-1 题注居中', sub: '居左 → 居中', p: 'p.1', sev: 'rule' },
          { t: '一级标题 段前段后', sub: '12/6 → 24/18', p: 'p.3', sev: 'rule' },
          { t: '[12] 缺 DOI · 仅建议', sub: 'GB/T 7714-2025', p: 'ref', sev: 'warn' },
        ].map((q, i) => (
          <div key={i} style={{
            padding: '8px 10px', marginBottom: 4,
            background: 'transparent',
            borderLeft: `3px solid ${q.sev === 'warn' ? 'var(--sun-500)' : 'var(--ink-300)'}`,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--ink-900)', fontWeight: 500 }}>{q.t}</div>
              <div className="mono" style={{ fontSize: 10, color: 'var(--ink-500)', marginTop: 2 }}>{q.sub} · {q.p}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: '12px 14px', borderTop: '1px solid var(--hair)', display: 'flex', gap: 8 }}>
        <HF.Btn kind="ghost" size="md">暂停修复</HF.Btn>
        <HF.Btn kind="primary" size="md" icon="check">进入校对台 →</HF.Btn>
      </div>
    </aside>
  );
}

function Triplet({ label, tone, body }) {
  const c = {
    ink:   'var(--ink-500)',
    brand: 'var(--brand-700)',
    rust:  'var(--rust-700)',
  }[tone];
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', fontSize: 11.5, lineHeight: 1.45 }}>
      <span className="mono" style={{
        flex: '0 0 38px', fontSize: 10, color: c, fontWeight: 600, letterSpacing: '.04em',
      }}>{label}</span>
      <span style={{ color: 'var(--ink-700)', flex: 1 }}>{body}</span>
    </div>
  );
}

// ───────── Bottom: scrubbable findings timeline ─────────
function FindingsTimeline() {
  const items = [
    { t: '页边距',     done: true,  cur: false, sev: 'rule' },
    { t: '正文字体',   done: false, cur: true,  sev: 'rule' },
    { t: '图 1-1 题注', done: false, cur: false, sev: 'rule' },
    { t: 'H1 段前段后', done: false, cur: false, sev: 'rule' },
    { t: '[12] 缺 DOI', done: false, cur: false, sev: 'warn' },
  ];
  return (
    <div style={{
      height: 76, padding: '10px 28px 14px',
      borderTop: '1px solid var(--hair)', background: 'var(--paper-0)', flex: '0 0 auto',
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span className="mono" style={{ fontSize: 9.5, color: 'var(--ink-400)', letterSpacing: '.14em' }}>FINDINGS TIMELINE</span>
        <span style={{ fontSize: 11, color: 'var(--ink-500)' }}>点击任一项即可跳读</span>
        <span style={{ flex: 1 }} />
        <span className="mono" style={{ fontSize: 10, color: 'var(--ink-400)' }}>1 项已修复 · 4 项待处理</span>
      </div>
      <div style={{
        position: 'relative', height: 36,
        background: 'var(--paper-1)', borderRadius: 4,
        padding: '0 8px',
        display: 'flex', alignItems: 'center',
      }}>
        {/* baseline rail */}
        <div style={{
          position: 'absolute', left: 12, right: 12, top: '50%',
          height: 2, background: 'var(--hair-strong)', transform: 'translateY(-50%)',
        }} />
        {/* completed segment */}
        <div style={{
          position: 'absolute', left: 12, top: '50%',
          width: '20%', height: 2, background: 'var(--rust-500)', transform: 'translateY(-50%)',
        }} />
        {/* tick markers */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 2 }}>
          {items.map((it, i) => (
            <div key={i} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              cursor: 'pointer',
            }}>
              <span style={{
                width: it.cur ? 14 : 10, height: it.cur ? 14 : 10, borderRadius: '50%',
                background: it.done ? 'var(--rust-500)' : it.cur ? 'var(--rust-700)' : it.sev === 'warn' ? 'var(--sun-100)' : 'var(--paper-0)',
                border: `1.5px solid ${it.done ? 'var(--rust-500)' : it.cur ? 'var(--rust-700)' : it.sev === 'warn' ? 'var(--sun-500)' : 'var(--ink-300)'}`,
                boxShadow: it.cur ? '0 0 0 3px rgba(184,84,47,.18)' : 'none',
                transition: 'all .2s',
              }} />
              <span className="mono" style={{
                fontSize: 9.5, color: it.cur ? 'var(--ink-900)' : 'var(--ink-500)',
                fontWeight: it.cur ? 600 : 400, whiteSpace: 'nowrap',
              }}>{it.t}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

window.RedesignStep4 = RedesignStep4;
