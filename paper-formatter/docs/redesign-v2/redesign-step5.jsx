/* global React, HF */
// redesign-step5.jsx — Step 5: 校对台 Proofreading Desk
// Improvements over current Step5Output:
//  • Findings shown as cards with before/after at the finding level
//  • Batch approve/reject by category; per-card override
//  • Right-side Content Integrity Certificate panel (text fingerprint proof)
//  • Download gated on all confirmed; "back to Step 4" path for any rejected

function RedesignStep5() {
  return (
    <div className="ab" style={{
      width: '100%', height: '100%',
      background: 'var(--paper-1)', display: 'grid',
      gridTemplateColumns: '212px 1fr', overflow: 'hidden',
    }}>
      <S5Sidebar />
      <main style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <S5TopBar />
        <S5SubBar />
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 320px', overflow: 'hidden' }}>
          <ProofDesk />
          <IntegrityPanel />
        </div>
      </main>
    </div>
  );
}

function S5Sidebar() {
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

      <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: 8, padding: '0 10px' }}>校对会话</div>
      <div style={{ padding: '10px 10px', background: 'rgba(255,255,255,.05)', borderRadius: 4, marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: 'var(--paper-0)', fontWeight: 500, lineHeight: 1.3, marginBottom: 6 }}>p0-basic-thesis.docx</div>
        <div className="mono" style={{ fontSize: 10, color: 'rgba(255,255,255,.5)', marginBottom: 8 }}>中国科学技术大学 · vAuto</div>
        <div style={{ height: 3, background: 'rgba(255,255,255,.1)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: '80%', background: 'var(--rust-500)' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontFamily: 'var(--mono)', fontSize: 9.5, color: 'rgba(255,255,255,.5)' }}>
          <span>第 5 步</span><span>80%</span>
        </div>
      </div>

      {/* category status */}
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: 8, padding: '0 10px' }}>本次类别</div>
      {[
        ['页面 / 版心', 2, 2],
        ['标题 / 段落', 5, 4],
        ['图题 / 表题', 4, 3],
        ['页码 / 分节', 2, 2],
        ['参考文献',    3, 0],
      ].map(([k, total, ok]) => (
        <div key={k} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 10px', fontSize: 11.5, color: 'rgba(255,255,255,.78)',
        }}>
          <span style={{
            width: 16, height: 4, borderRadius: 2, background: 'rgba(255,255,255,.1)',
            position: 'relative', overflow: 'hidden',
          }}>
            <span style={{
              position: 'absolute', left: 0, top: 0, bottom: 0,
              width: `${(ok / total) * 100}%`,
              background: ok === total ? 'var(--leaf-500)' : 'var(--rust-500)',
            }} />
          </span>
          <span style={{ flex: 1 }}>{k}</span>
          <span className="mono num" style={{ fontSize: 10.5, color: 'rgba(255,255,255,.55)' }}>{ok}/{total}</span>
        </div>
      ))}

      <div style={{ flex: 1 }} />

      <div style={{
        padding: '12px 12px', border: '1px solid rgba(255,255,255,.12)', borderRadius: 4,
        fontSize: 11, lineHeight: 1.5, color: 'rgba(255,255,255,.6)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--leaf-500)' }} />
          <span className="mono" style={{ fontSize: 9.5, letterSpacing: '.14em', color: 'rgba(255,255,255,.65)' }}>DOWNLOAD GATE</span>
        </div>
        全部确认后方可下载；原稿永久保留
      </div>
    </aside>
  );
}

function S5TopBar() {
  const steps = ['上传', '学校', '体检', '修复', '确认', '下载'];
  const current = 4;
  return (
    <header style={{
      height: 56, padding: '0 28px', display: 'flex', alignItems: 'center', gap: 22,
      borderBottom: '1px solid var(--hair)', background: 'var(--paper-0)', flex: '0 0 auto',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <HF.Icon name="file" size={16} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-900)' }}>p0-basic-thesis.docx</div>
          <div className="mono" style={{ fontSize: 10, color: 'var(--ink-500)', marginTop: 2 }}>中国科学技术大学 · vAuto · 16 项修复 · 0 项篡改</div>
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

function S5SubBar() {
  return (
    <div style={{
      minHeight: 52, padding: '0 28px', display: 'flex', alignItems: 'center', gap: 12,
      borderBottom: '1px solid var(--hair)', background: 'var(--paper-0)', flex: '0 0 auto',
    }}>
      <span className="chip" style={{ background: 'var(--brand-50)', color: 'var(--brand-900)' }}>校 对 台</span>
      <span style={{ fontSize: 12.5, color: 'var(--ink-700)' }}>
        <span className="mono num" style={{ color: 'var(--leaf-700)', fontWeight: 600 }}>11</span> 已批准 · 
        <span className="mono num" style={{ color: 'var(--sun-700)', fontWeight: 600, marginLeft: 4 }}>3</span> 待复核 · 
        <span className="mono num" style={{ color: 'var(--rust-700)', fontWeight: 600, marginLeft: 4 }}>2</span> 已存疑
      </span>
      <span style={{ flex: 1 }} />
      {/* category filter chips */}
      {['全部', '页面', '标题', '图表', '页码', '参考文献'].map((c, i) => (
        <button key={c} style={{
          padding: '5px 12px', borderRadius: 16, border: '1px solid var(--hair-strong)',
          background: i === 0 ? 'var(--ink-900)' : 'transparent',
          color: i === 0 ? 'var(--paper-0)' : 'var(--ink-700)',
          fontSize: 11.5, fontFamily: 'var(--sans)', cursor: 'pointer',
        }}>{c}</button>
      ))}
      <div style={{ width: 1, height: 18, background: 'var(--hair-strong)' }} />
      <HF.Btn kind="ghost" size="sm">⌥ 全部存疑</HF.Btn>
      <HF.Btn kind="primary" size="sm">✓ 全部批准</HF.Btn>
    </div>
  );
}

// ───────── Center: scrollable list of finding cards w/ before/after ─────────
function ProofDesk() {
  const findings = [
    {
      tag: '正文 · 字体', sev: 'rule', state: 'approved', page: 'p.1 · §1.1',
      title: '正文字体槽 宋体 / Times',
      rule: '中国科学技术大学 vAuto · body_fonts',
      before: { font: 'SimSun + Arial 10.5pt' },
      after:  { font: '宋体 / Times New Roman · 小四 · 1.5 倍行距' },
      msg: '替换字体槽 · 不改字号 · 影响段落 3 / 87',
    },
    {
      tag: '标题 · 一级', sev: 'rule', state: 'approved', page: 'p.3 · §1.2',
      title: '一级标题段前段后',
      rule: '校规则 vAuto · h1_paragraph',
      before: { font: '段前 12 段后 6 · 居左' },
      after:  { font: '段前 24 段后 18 · 居中 · 黑体 三号' },
      msg: '调整段前段后并居中 · 影响 6 个标题',
    },
    {
      tag: '图 · 题注', sev: 'rule', state: 'pending', page: 'p.1 · 图 1-1',
      title: '图题居中且置图下',
      rule: '校规则 vAuto · figure_caption',
      before: { font: '居左 · 紧贴图下方' },
      after:  { font: '居中 · 间距 6pt · 章节编号' },
      msg: '影响 12 张图题；表题置上规则单独处理',
    },
    {
      tag: '文献 · [12]', sev: 'warn', state: 'review', page: 'ref.[12]',
      title: '[12] 缺 DOI · 仅给建议',
      rule: 'GB/T 7714-2025 · 推荐字段',
      before: { font: '无 DOI 字段' },
      after:  { font: '系统未自动补全 · 建议在 Zotero 中手工补全后重新导出' },
      msg: '不会自动改写文献条目；标记为待复核',
    },
  ];
  return (
    <div style={{ overflow: 'auto', padding: '20px 28px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <h2 className="serif" style={{ margin: 0, fontSize: 22, fontWeight: 600, color: 'var(--ink-900)', letterSpacing: -.4 }}>逐项校对</h2>
        <span style={{ fontSize: 12, color: 'var(--ink-500)' }}>左 · 改前 　 右 · 改后　·　每一项都背靠规则原文</span>
      </div>

      {findings.map((f, i) => (
        <FindingCard key={i} {...f} />
      ))}
    </div>
  );
}

function FindingCard({ tag, sev, state, page, title, rule, before, after, msg }) {
  const stateMeta =
    state === 'approved' ? { c: 'var(--leaf-700)', bg: 'var(--leaf-100)', l: '已批准', icon: '✓' } :
    state === 'review'   ? { c: 'var(--sun-700)',  bg: 'var(--sun-100)',  l: '需复核', icon: '!' } :
                            { c: 'var(--ink-700)',  bg: 'var(--paper-2)',  l: '待确认', icon: '·' };
  const sevBorder =
    sev === 'warn' ? 'var(--sun-500)' :
    sev === 'cap'  ? 'var(--rust-500)' :
                     'var(--brand-700)';
  return (
    <article style={{
      background: 'var(--paper-0)', borderRadius: 6,
      border: '1px solid var(--hair)',
      borderLeft: `3px solid ${sevBorder}`,
      overflow: 'hidden',
    }}>
      {/* header */}
      <div style={{
        padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: '1px solid var(--hair)',
      }}>
        <span style={{
          fontSize: 10, padding: '3px 7px', borderRadius: 2,
          background: 'var(--paper-2)', color: 'var(--ink-700)',
          fontFamily: 'var(--mono)', letterSpacing: '.06em',
        }}>{tag}</span>
        <div className="serif" style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink-900)', letterSpacing: -.2 }}>{title}</div>
        <span style={{ flex: 1 }} />
        <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-500)' }}>{page}</span>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '3px 8px', borderRadius: 12, background: stateMeta.bg, color: stateMeta.c,
          fontSize: 11, fontWeight: 600,
        }}>
          <span style={{ fontFamily: 'var(--mono)' }}>{stateMeta.icon}</span> {stateMeta.l}
        </span>
      </div>

      {/* before / after */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
        <div style={{ padding: '14px 18px', borderRight: '1px solid var(--hair)', background: 'var(--paper-1)' }}>
          <div className="mono" style={{ fontSize: 9.5, color: 'var(--ink-400)', letterSpacing: '.14em', marginBottom: 6 }}>改前 · BEFORE</div>
          <div className="serif" style={{ fontSize: 13.5, color: 'var(--ink-700)' }}>{before.font}</div>
        </div>
        <div style={{ padding: '14px 18px', background: 'rgba(184,84,47,.04)', position: 'relative' }}>
          <div className="mono" style={{ fontSize: 9.5, color: 'var(--rust-700)', letterSpacing: '.14em', marginBottom: 6 }}>改后 · AFTER</div>
          <div className="serif" style={{ fontSize: 13.5, color: 'var(--ink-900)', fontWeight: 500 }}>{after.font}</div>
          <div style={{ position: 'absolute', left: -1, top: 14, bottom: 14, width: 2, background: 'var(--rust-500)' }} />
        </div>
      </div>

      {/* rule + msg + ops */}
      <div style={{
        padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 14,
        borderTop: '1px solid var(--hair)',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="mono" style={{ fontSize: 10, color: 'var(--brand-700)', fontWeight: 600, letterSpacing: '.04em' }}>规则 · {rule}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 3 }}>{msg}</div>
        </div>
        <button style={{
          border: 'none', background: 'transparent', fontSize: 11.5, color: 'var(--brand-700)',
          cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3,
        }}>看证据 →</button>
        <button style={{
          border: 'none', background: 'transparent', fontSize: 11.5, color: 'var(--ink-500)',
          cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3,
        }}>回 Step 4 重看修复</button>
        <div style={{ width: 1, height: 16, background: 'var(--hair-strong)' }} />
        <HF.Btn kind={state === 'approved' ? 'ghost' : 'primary'} size="sm">{state === 'approved' ? '撤回批准' : '✓ 批准'}</HF.Btn>
        <HF.Btn kind="ghost" size="sm">⌥ 存疑</HF.Btn>
      </div>
    </article>
  );
}

// ───────── Right: integrity certificate panel ─────────
function IntegrityPanel() {
  return (
    <aside style={{
      background: 'var(--paper-0)', borderLeft: '1px solid var(--hair)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* fingerprint certificate */}
      <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--hair)' }}>
        <div className="mono" style={{ fontSize: 9.5, color: 'var(--ink-400)', letterSpacing: '.16em', marginBottom: 6 }}>
          CONTENT INTEGRITY · 文本指纹证书
        </div>
        <div className="serif" style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink-900)', marginBottom: 10, letterSpacing: -.2 }}>
          ✓ 正文 0 篡改
        </div>

        {/* fingerprint pair */}
        <div style={{
          background: 'var(--paper-1)', borderRadius: 4, padding: '12px 14px',
          fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-700)',
          marginBottom: 10,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ color: 'var(--ink-400)' }}>原稿 sha256</span>
            <span style={{ color: 'var(--leaf-700)', fontSize: 9.5 }}>● MATCH</span>
          </div>
          <div style={{ fontSize: 10, lineHeight: 1.55, marginBottom: 10, wordBreak: 'break-all' }}>
            a4e8…6f2c9b21d8…
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ color: 'var(--ink-400)' }}>新稿 sha256</span>
            <span style={{ color: 'var(--leaf-700)', fontSize: 9.5 }}>● MATCH</span>
          </div>
          <div style={{ fontSize: 10, lineHeight: 1.55, wordBreak: 'break-all' }}>
            a4e8…6f2c9b21d8…
          </div>
        </div>

        <div style={{ fontSize: 11, color: 'var(--ink-500)', lineHeight: 1.5 }}>
          正文、脚注、表格单元格、参考文献条目、公式语义文本逐段 hash 比对一致。<span style={{ color: 'var(--ink-900)', fontWeight: 500 }}>修改仅作用于格式属性。</span>
        </div>
      </div>

      {/* metrics */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--hair)' }}>
        <div className="mono" style={{ fontSize: 9.5, color: 'var(--ink-400)', letterSpacing: '.16em', marginBottom: 8 }}>本次修复</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            ['16 项', '修复'],
            ['98.6%', '规则通过率'],
            ['100%',  '页码正确'],
            ['18.4s', '用时'],
          ].map(([n, l]) => (
            <div key={l} style={{ background: 'var(--paper-1)', borderRadius: 3, padding: '10px 12px' }}>
              <div className="serif num" style={{ fontSize: 20, fontWeight: 600, color: 'var(--ink-900)', lineHeight: 1, letterSpacing: -.3 }}>{n}</div>
              <div style={{ fontSize: 10.5, color: 'var(--ink-500)', marginTop: 4 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* whitelisted-only proof */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--hair)' }}>
        <div className="mono" style={{ fontSize: 9.5, color: 'var(--ink-400)', letterSpacing: '.16em', marginBottom: 8 }}>白名单修改范围</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {[
            '段落格式', '字符样式', '分节属性', '页码域', 'TOC 域', '题注', '图表对齐',
          ].map(t => (
            <span key={t} style={{
              fontSize: 11, padding: '3px 8px', borderRadius: 2,
              background: 'var(--leaf-100)', color: 'var(--leaf-700)',
            }}>{t}</span>
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
          {[
            '正文文字', '段序', '脚注内容', '引用条目', '图片像素',
          ].map(t => (
            <span key={t} style={{
              fontSize: 11, padding: '3px 8px', borderRadius: 2,
              background: 'var(--paper-2)', color: 'var(--ink-500)',
              textDecoration: 'line-through', textDecorationColor: 'var(--ink-400)',
            }}>{t}</span>
          ))}
        </div>
        <div style={{ fontSize: 10.5, color: 'var(--ink-400)', marginTop: 6, letterSpacing: '.02em' }}>
          划线 = 系统永久禁止修改
        </div>
      </div>

      <div style={{ flex: 1 }} />

      {/* final commit */}
      <div style={{ padding: '14px 18px', borderTop: '1px solid var(--hair)', background: 'var(--paper-1)' }}>
        <div style={{
          padding: '10px 12px', background: 'var(--sun-100)', borderRadius: 3,
          fontSize: 11.5, color: 'var(--sun-700)', lineHeight: 1.5, marginBottom: 10,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 14 }}>!</span>
          仍有 3 项需复核 · 全部确认后开放下载
        </div>
        <HF.Btn kind="primary" icon="download" size="lg">下载新文档</HF.Btn>
      </div>
    </aside>
  );
}

window.RedesignStep5 = RedesignStep5;
