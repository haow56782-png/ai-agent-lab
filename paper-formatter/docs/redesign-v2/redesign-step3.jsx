/* global React, HF */
// redesign-step3.jsx — Step 3: 结构 X 光探针
// "Document under glass" — center: paper with scanner sweep + magnifier
// Left: structure skeleton tree being populated phase by phase
// Right: live findings dock with rule color-coding
// Bottom: stage strip + rule-pack pill

function RedesignStep3() {
  return (
    <div className="ab" style={{ width: '100%', height: '100%', background: 'var(--paper-1)', display: 'grid', gridTemplateColumns: '212px 1fr', overflow: 'hidden' }}>
      {/* sidebar (compact, reused chrome) */}
      <Step3Sidebar />

      <main style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Step3TopBar />
        <Step3SubBar />
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '260px 1fr 300px', overflow: 'hidden' }}>
          <SkeletonTree />
          <PaperUnderGlass />
          <LiveFindingsDock />
        </div>
        <Step3FooterStrip />
      </main>
    </div>
  );
}

// ───────── Sidebar ─────────
function Step3Sidebar() {
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

      <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: 8, padding: '0 10px' }}>体检会话</div>
      <div style={{ padding: '10px 10px', background: 'rgba(255,255,255,.05)', borderRadius: 4, marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: 'var(--paper-0)', fontWeight: 500, lineHeight: 1.3, marginBottom: 6 }}>p0-basic-thesis.docx</div>
        <div className="mono" style={{ fontSize: 10, color: 'rgba(255,255,255,.5)', marginBottom: 8 }}>中国科学技术大学 · vAuto</div>
        <div style={{ height: 3, background: 'rgba(255,255,255,.1)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: '62%', background: 'var(--rust-500)' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontFamily: 'var(--mono)', fontSize: 9.5, color: 'rgba(255,255,255,.5)' }}>
          <span>体检中</span><span>62%</span>
        </div>
      </div>

      {/* Discovered counts — live ticker */}
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: 8, padding: '0 10px' }}>已识别</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {[
          ['标题', '24'],
          ['图', '12'],
          ['表', '8'],
          ['参考文献', '41'],
        ].map(([k, v]) => (
          <div key={k} style={{
            padding: '8px 10px', background: 'rgba(255,255,255,.04)', borderRadius: 3,
          }}>
            <div className="mono num" style={{ fontSize: 18, fontWeight: 600, color: 'var(--paper-0)', lineHeight: 1 }}>{v}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.55)', marginTop: 3 }}>{k}</div>
          </div>
        ))}
      </div>

      <div style={{ flex: 1 }} />

      <div style={{
        padding: '12px 12px', border: '1px solid rgba(255,255,255,.12)', borderRadius: 4,
        fontSize: 11, lineHeight: 1.5, color: 'rgba(255,255,255,.6)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--leaf-500)' }} />
          <span className="mono" style={{ fontSize: 9.5, letterSpacing: '.14em', color: 'rgba(255,255,255,.65)' }}>READ-ONLY</span>
        </div>
        体检阶段不写文档 · 仅读取 · 不落盘
      </div>
    </aside>
  );
}

function Step3TopBar() {
  const steps = ['上传', '学校', '体检', '修复', '确认', '下载'];
  const current = 2;
  return (
    <header style={{
      height: 56, padding: '0 28px', display: 'flex', alignItems: 'center', gap: 22,
      borderBottom: '1px solid var(--hair)', background: 'var(--paper-0)', flex: '0 0 auto',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '0 0 auto', minWidth: 0 }}>
        <HF.Icon name="file" size={16} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-900)', lineHeight: 1.1 }}>p0-basic-thesis.docx</div>
          <div className="mono" style={{ fontSize: 10, color: 'var(--ink-500)', marginTop: 2 }}>中国科学技术大学 · vAuto · GB/T 7713.1-2025 基线</div>
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

// ───────── Sub-bar: phase tabs + ETA + magnifier toggle ─────────
function Step3SubBar() {
  const phases = [
    { k: 'PRS', l: '解析 DOCX',       done: true,  cur: false },
    { k: 'STR', l: '结构识别',         done: true,  cur: false },
    { k: 'REF', l: '图表 + 文献',      done: false, cur: true  },
    { k: 'CHK', l: '规则预匹配',       done: false, cur: false },
  ];
  return (
    <div style={{
      height: 44, padding: '0 28px', display: 'flex', alignItems: 'center', gap: 14,
      borderBottom: '1px solid var(--hair)', background: 'var(--paper-0)', flex: '0 0 auto',
    }}>
      <span className="chip" style={{ background: 'var(--brand-50)', color: 'var(--brand-900)' }}>体检中 · READ ONLY</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {phases.map((p, i) => (
          <React.Fragment key={p.k}>
            {i > 0 && <div style={{ width: 12, height: 1, background: 'var(--hair-strong)' }} />}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 8px', borderRadius: 3,
              background: p.cur ? 'var(--rust-100)' : 'transparent',
            }}>
              <span style={{
                width: 12, height: 12, borderRadius: 6,
                border: `1.4px solid ${p.done || p.cur ? 'var(--ink-900)' : 'var(--ink-300)'}`,
                background: p.done ? 'var(--ink-900)' : p.cur ? 'var(--rust-500)' : 'transparent',
                color: p.done || p.cur ? 'var(--paper-0)' : 'transparent',
                fontSize: 8, fontFamily: 'var(--mono)', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{p.done ? '✓' : ''}</span>
              <span style={{ fontSize: 11.5, color: p.cur ? 'var(--rust-700)' : 'var(--ink-700)', fontWeight: p.cur ? 600 : 400 }}>{p.l}</span>
              <span className="mono" style={{ fontSize: 9.5, color: 'var(--ink-400)' }}>{p.k}</span>
            </div>
          </React.Fragment>
        ))}
      </div>
      <span style={{ flex: 1 }} />
      <span className="mono" style={{ fontSize: 11, color: 'var(--ink-500)' }}>ETA 0:14 · p_avg 0.94</span>
      <SegBtn options={[['off', '原稿'], ['xray', 'X 光'], ['mag', '放大']]} value="xray" />
    </div>
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
          fontSize: 11.5, fontWeight: value === v ? 600 : 400,
          fontFamily: 'var(--sans)',
          boxShadow: value === v ? 'var(--shadow-soft)' : 'none',
        }}>{l}</button>
      ))}
    </div>
  );
}

// ───────── Left: skeleton tree being populated ─────────
function SkeletonTree() {
  const tree = [
    { k: '封面', conf: 0.99, state: 'done' },
    { k: '摘要 · Abstract', conf: 0.97, state: 'done', sub: ['关键词 ×6'] },
    { k: '目录', conf: 0.95, state: 'done' },
    { k: '第 1 章 绪论', conf: 0.94, state: 'done', sub: ['1.1 研究背景', '1.2 国内外研究现状', '1.3 主要工作'] },
    { k: '第 2 章 相关理论', conf: 0.93, state: 'done', sub: ['2.1 卷积神经网络', '2.2 注意力机制'] },
    { k: '第 3 章 网络结构', conf: 0.92, state: 'active', sub: ['3.1 …', '3.2 …'] },
    { k: '第 4 章 实验与分析', conf: null, state: 'pending' },
    { k: '参考文献 ×41', conf: 0.71, state: 'low' },
    { k: '附录 / 致谢', conf: null, state: 'pending' },
  ];
  return (
    <aside style={{
      background: 'var(--paper-0)', borderRight: '1px solid var(--hair)',
      padding: '16px 16px', overflow: 'auto', display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
        <span className="serif" style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-900)' }}>结构骨架</span>
        <span className="mono" style={{ fontSize: 10, color: 'var(--ink-400)' }}>OUTLINE</span>
      </div>
      <div style={{ fontSize: 11, color: 'var(--ink-500)', marginBottom: 12, lineHeight: 1.5 }}>
        随扫描进度实时长出。低置信度<span style={{ color: 'var(--sun-700)' }}> ▲ </span>标记后转人工建议。
      </div>

      {/* tree */}
      <div style={{ position: 'relative', paddingLeft: 8 }}>
        {/* vertical spine */}
        <div style={{
          position: 'absolute', left: 6, top: 8, bottom: 8, width: 1,
          background: 'var(--hair-strong)',
        }} />
        {tree.map((n, i) => {
          const sym = n.state === 'done' ? '●' : n.state === 'active' ? '◐' : n.state === 'low' ? '▲' : '○';
          const col =
            n.state === 'done'    ? 'var(--leaf-700)'
          : n.state === 'active'  ? 'var(--rust-500)'
          : n.state === 'low'     ? 'var(--sun-700)'
          :                          'var(--ink-300)';
          return (
            <div key={i} style={{
              position: 'relative', paddingLeft: 18, marginBottom: 8,
              opacity: n.state === 'pending' ? .45 : 1,
              transition: 'opacity .3s',
            }}>
              <span style={{
                position: 'absolute', left: -2, top: 2,
                fontFamily: 'var(--mono)', fontSize: 11, color: col,
              }}>{sym}</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 12.5, color: 'var(--ink-900)', fontWeight: n.state === 'active' ? 600 : 500 }}>{n.k}</span>
                {n.conf !== null && (
                  <span className="mono num" style={{ fontSize: 10, color: n.state === 'low' ? 'var(--sun-700)' : 'var(--ink-500)' }}>{n.conf.toFixed(2)}</span>
                )}
              </div>
              {n.sub && (
                <div style={{ paddingLeft: 8, marginTop: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {n.sub.map((s, j) => (
                    <div key={j} style={{ fontSize: 11.5, color: 'var(--ink-500)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 4, height: 1, background: 'var(--ink-300)' }} />
                      {s}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

// ───────── Center: paper under glass with scanner sweep ─────────
function PaperUnderGlass() {
  return (
    <div style={{
      background: 'var(--paper-1)', padding: '24px 32px', overflow: 'hidden',
      position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
    }}>
      {/* glass slab */}
      <div style={{
        width: 480, height: '100%', maxHeight: 720,
        background: '#fff',
        boxShadow: '0 24px 60px -16px rgba(0,0,0,.2), 0 0 0 1px rgba(0,0,0,.04)',
        position: 'relative', overflow: 'hidden',
        padding: '40px 48px 32px',
      }}>
        {/* paper content */}
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div className="serif" style={{ fontSize: 10, color: 'var(--ink-400)', marginBottom: 12 }}>本科毕业论文</div>
          <div className="serif" style={{ fontSize: 20, fontWeight: 600, color: 'var(--ink-900)' }}>基于深度学习的图像超分辨率重建研究</div>
        </div>

        <div className="serif" style={{ fontSize: 11, color: 'var(--ink-700)', textAlign: 'right', marginBottom: 8, fontStyle: 'italic' }}>
          中国科学技术大学
        </div>

        {/* H1 placeholder */}
        <div className="serif" style={{
          fontSize: 14, fontWeight: 600, color: 'var(--ink-900)',
          textAlign: 'center', margin: '14px 0 10px', position: 'relative',
        }}>
          第 1 章 绪论
          <div style={{
            position: 'absolute', right: -12, top: 4, width: 6, height: 6,
            borderRadius: 3, background: 'var(--leaf-500)',
          }} title="已识别" />
        </div>

        {/* fake body */}
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} style={{
            height: 2.5, background: 'var(--paper-3)',
            width: ['96%', '88%', '92%', '70%'][i % 4],
            marginBottom: 5,
            position: 'relative',
          }} />
        ))}

        {/* figure placeholder mid-page */}
        <div style={{ position: 'relative', margin: '12px 0' }}>
          <div style={{
            height: 56, background: 'var(--paper-2)', border: '1px solid var(--hair)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="100" height="34" viewBox="0 0 100 34">
              {[6, 22, 38, 54, 70, 86].map((x, i) => (
                <rect key={i} x={x} y={6 + i * 1} width="10" height={20 + i * 2} fill="var(--brand-500)" opacity={.2 + i * .12} />
              ))}
            </svg>
          </div>
          <div className="serif" style={{ fontSize: 9, color: 'var(--ink-700)', textAlign: 'center', marginTop: 4, fontStyle: 'italic' }}>
            图 1-1 主要研究内容
          </div>
        </div>

        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{
            height: 2.5, background: 'var(--paper-3)',
            width: ['96%', '88%', '92%', '70%'][i % 4],
            marginBottom: 5,
          }} />
        ))}

        {/* GLASS overlay — scanline sweep & grid */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `
            linear-gradient(180deg, rgba(184,84,47,.06), rgba(184,84,47,0) 30%),
            repeating-linear-gradient(180deg, transparent 0 24px, rgba(21,23,27,.04) 24px 25px)
          `,
        }} />
        {/* scanner bar — accent */}
        <div style={{
          position: 'absolute', left: 0, right: 0, top: '62%',
          height: 32, background: 'linear-gradient(180deg, rgba(184,84,47,0), rgba(184,84,47,.18), rgba(184,84,47,0))',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 'calc(62% + 16px)',
          height: 1.5, background: 'var(--rust-500)',
          boxShadow: '0 0 12px var(--rust-500)', pointerEvents: 'none',
        }} />

        {/* magnifier callout */}
        <div style={{
          position: 'absolute', left: 12, top: '58%',
          width: 96, height: 96, borderRadius: 48,
          border: '2px solid var(--ink-900)',
          background: 'rgba(255,255,255,.96)',
          boxShadow: '0 12px 32px -8px rgba(0,0,0,.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 4, pointerEvents: 'none',
        }}>
          <div className="mono" style={{ fontSize: 9, color: 'var(--ink-500)', letterSpacing: '.1em' }}>FIG · 1-1</div>
          <div className="serif" style={{ fontSize: 12, color: 'var(--ink-900)', fontWeight: 600 }}>图题已识别</div>
          <div className="mono num" style={{ fontSize: 11, color: 'var(--leaf-700)' }}>0.92</div>
        </div>
        <div style={{
          position: 'absolute', left: 108, top: '74%', width: 36, height: 1.5,
          background: 'var(--ink-900)', transform: 'rotate(-30deg)', transformOrigin: 'left',
        }} />

        {/* page number */}
        <div style={{ position: 'absolute', bottom: 12, left: 0, right: 0, textAlign: 'center', fontFamily: 'var(--serif)', fontSize: 10, color: 'var(--ink-400)' }}>
          — 1 —
        </div>
      </div>

      {/* page indicator pill below */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 14,
        display: 'flex', justifyContent: 'center', gap: 4,
      }}>
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} style={{
            width: i === 0 ? 18 : 8, height: 4, borderRadius: 2,
            background: i === 0 ? 'var(--rust-500)' : i < 2 ? 'var(--ink-700)' : 'var(--ink-300)',
          }} />
        ))}
      </div>
    </div>
  );
}

// ───────── Right: live findings dock ─────────
function LiveFindingsDock() {
  const findings = [
    { k: '页边距', src: 'GB/T 7713.1', sev: 'rule',  body: '页边距应 上25 下25 左30 右25，实测 上20', state: 'will' },
    { k: '正文字体', src: '学校规则 vAuto', sev: 'rule',  body: '正文字体应为 宋体 / Times，实测 SimSun + Arial', state: 'will' },
    { k: '图 1-1 题注', src: '校规则',     sev: 'cap',   body: '图题应居中置图下，实测 居左', state: 'will' },
    { k: '一级标题', src: '校规则',         sev: 'h1',    body: '黑体 三号 段前 24，实测 段前 12', state: 'will' },
    { k: '参考文献 [12]', src: 'GB/T 7714', sev: 'warn', body: '缺 DOI；条目正文不变，仅给建议', state: 'advise' },
  ];
  return (
    <aside style={{
      background: 'var(--paper-0)', borderLeft: '1px solid var(--hair)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <div style={{ padding: '16px 18px 10px', borderBottom: '1px solid var(--hair)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
          <span className="serif" style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-900)' }}>发现项 · 实时入坞</span>
          <span className="mono" style={{ fontSize: 10, color: 'var(--ink-400)' }}>FINDINGS</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-500)', lineHeight: 1.5 }}>
          仅生成 finding · 不写文档 · 修复在第 4 步
        </div>

        {/* mini counts */}
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          {[
            ['校规则', 11, 'var(--brand-700)'],
            ['GB 基线', 4, 'var(--ink-700)'],
            ['建议',   3, 'var(--sun-700)'],
          ].map(([k, n, c]) => (
            <div key={k} style={{
              flex: 1, padding: '6px 8px', background: 'var(--paper-1)', borderRadius: 3,
            }}>
              <div className="mono num" style={{ fontSize: 16, fontWeight: 700, color: c, lineHeight: 1 }}>{n}</div>
              <div style={{ fontSize: 10, color: 'var(--ink-500)', marginTop: 3 }}>{k}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '8px 12px' }}>
        {findings.map((f, i) => (
          <div key={i} style={{
            padding: '10px 12px', marginBottom: 6,
            background: 'var(--paper-0)',
            border: `1px solid ${f.sev === 'warn' ? 'var(--sun-500)' : 'var(--hair)'}`,
            borderLeft: `3px solid ${
              f.sev === 'warn' ? 'var(--sun-500)'
            : f.sev === 'cap'  ? 'var(--rust-500)'
            : 'var(--brand-700)'
            }`,
            borderRadius: 3,
            animation: i === 4 ? 'protoFadeUp .3s ease' : 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-900)' }}>{f.k}</span>
              <span style={{ flex: 1 }} />
              <span className="mono" style={{ fontSize: 9.5, color: 'var(--ink-400)', letterSpacing: '.06em' }}>{f.src}</span>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-500)', lineHeight: 1.5, marginBottom: 6 }}>{f.body}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{
                fontSize: 10, padding: '2px 6px', borderRadius: 2,
                background: f.state === 'advise' ? 'var(--sun-100)' : 'var(--brand-50)',
                color:      f.state === 'advise' ? 'var(--sun-700)' : 'var(--brand-900)',
                fontWeight: 600,
              }}>{f.state === 'advise' ? '将给出建议' : '将自动修复'}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: '12px 14px', borderTop: '1px solid var(--hair)', display: 'flex', gap: 8 }}>
        <HF.Btn kind="ghost" size="md">查看完整列表</HF.Btn>
        <HF.Btn kind="primary" icon="sparkle" size="md">进入修复 →</HF.Btn>
      </div>
    </aside>
  );
}

function Step3FooterStrip() {
  return (
    <div style={{
      height: 38, padding: '0 28px',
      borderTop: '1px solid var(--hair)', background: 'var(--paper-0)',
      display: 'flex', alignItems: 'center', gap: 16, flex: '0 0 auto',
    }}>
      <span className="mono" style={{ fontSize: 10, color: 'var(--ink-400)', letterSpacing: '.14em' }}>
        REVIEWING · 第 3 / 6 步
      </span>
      <div style={{ width: 1, height: 14, background: 'var(--hair)' }} />
      <span style={{ fontSize: 11, color: 'var(--ink-500)' }}>
        规则包：<span style={{ color: 'var(--ink-900)', fontWeight: 500 }}>中国科学技术大学 vAuto · 142 条</span>
      </span>
      <span style={{ flex: 1 }} />
      <span style={{ fontSize: 11, color: 'var(--ink-500)' }}>
        <span className="mono num" style={{ color: 'var(--ink-900)', fontWeight: 600 }}>18</span> 发现 · 
        <span className="mono num" style={{ color: 'var(--ink-900)', fontWeight: 600, marginLeft: 4 }}>15</span> 自动 · 
        <span className="mono num" style={{ color: 'var(--sun-700)', fontWeight: 600, marginLeft: 4 }}>3</span> 建议
      </span>
    </div>
  );
}

window.RedesignStep3 = RedesignStep3;
