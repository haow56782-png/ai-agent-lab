/* global React, HF */
// redesign-brief.jsx — Improvement brief: problem → philosophy → moves

function RedesignBrief() {
  return (
    <div className="ab" style={{
      width: '100%', height: '100%',
      background: 'var(--paper-0)',
      padding: '52px 64px 48px',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 32, right: 40,
        fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-400)',
        letterSpacing: '.16em', textTransform: 'uppercase', textAlign: 'right',
      }}>
        正稿 · ZHENGGAO<br/>
        <span style={{ opacity: .65 }}>改版稿 · Redesign Brief</span>
      </div>

      <div className="secdex">改 版 · Step 3 / 4 / 5 — Redesign Brief</div>

      <h1 className="serif" style={{
        margin: '14px 0 8px', fontSize: 48, lineHeight: 1.05, letterSpacing: -.8,
        color: 'var(--ink-900)', fontWeight: 600, maxWidth: 920,
      }}>
        把“黑盒批处理”做成<br/>
        <span style={{ fontStyle: 'italic', color: 'var(--brand-700)' }}>可旁观、可质询、可回退</span>的红笔工坊。
      </h1>
      <p style={{
        maxWidth: 720, margin: '0 0 28px',
        fontSize: 15, lineHeight: 1.65, color: 'var(--ink-500)',
      }}>
        从代码库现状出发——Step3 已选定 “document under glass” 的体检面、Step4 正在从动画演示收敛成真实修复工作台、Step5 把控下载守门。
        三步之间缺乏一条贯穿的<strong>“证据—规则—修改—确认”红线</strong>。本次改版围绕这条线重做。
      </p>

      <div className="hrule" style={{ marginBottom: 24 }} />

      {/* Three columns — diagnose / philosophy / moves */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.1fr', gap: 36 }}>
        {/* Diagnose */}
        <div>
          <div className="mono" style={{ fontSize: 10.5, letterSpacing: '.16em', color: 'var(--rust-700)', fontWeight: 600, marginBottom: 10 }}>① 诊 断</div>
          <div className="serif" style={{ fontSize: 19, fontWeight: 600, color: 'var(--ink-900)', marginBottom: 14, letterSpacing: -.2 }}>
            当前三屏的“信任断点”
          </div>
          {[
            ['Step3 体检', '只展示总进度，不展示<strong>结构正在被发现</strong>，体检的成就感稀薄。'],
            ['Step4 修复', '动画播放 finding，但用户<strong>只能看、不能管</strong>——无法跳读、否决、追溯。'],
            ['Step5 确认', '更接近“清单签收”而不是<strong>“校对台”</strong>。批准 / 异议 / 证据三件套缺失。'],
          ].map(([h, b], i) => (
            <div key={i} style={{
              padding: '10px 0', borderBottom: i < 2 ? '1px dashed var(--hair)' : 'none',
              fontSize: 12.5, color: 'var(--ink-700)', lineHeight: 1.55,
            }}>
              <span style={{ fontWeight: 600, color: 'var(--ink-900)' }}>{h}</span>　
              <span dangerouslySetInnerHTML={{ __html: b }} />
            </div>
          ))}
        </div>

        {/* Philosophy */}
        <div>
          <div className="mono" style={{ fontSize: 10.5, letterSpacing: '.16em', color: 'var(--brand-700)', fontWeight: 600, marginBottom: 10 }}>② 哲 学</div>
          <div className="serif" style={{ fontSize: 19, fontWeight: 600, color: 'var(--ink-900)', marginBottom: 14, letterSpacing: -.2 }}>
            红笔，而不是橡皮擦
          </div>
          <p style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--ink-700)', margin: 0 }}>
            学生信任的 “排版工具” 应当像一位<strong>戴白手套的副导师</strong>：
          </p>
          <ul style={{
            margin: '10px 0 0', padding: 0, listStyle: 'none',
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            {[
              ['可旁观',  '一切修改都在眼前发生，没有看不见的悄悄改'],
              ['可质询',  '每一笔修改都背靠规则条文，敢被反问 “为什么”'],
              ['可回退',  '红笔下任意一个点头都能撤销，原稿永远在'],
            ].map(([k, v], i) => (
              <li key={i} style={{
                display: 'flex', gap: 12, fontSize: 12.5, lineHeight: 1.55,
                color: 'var(--ink-700)',
              }}>
                <span style={{
                  flex: '0 0 60px', fontFamily: 'var(--mono)', fontSize: 11,
                  color: 'var(--brand-700)', fontWeight: 600, letterSpacing: '.04em',
                  paddingTop: 1,
                }}>{k}</span>
                <span>{v}</span>
              </li>
            ))}
          </ul>
          <div style={{
            marginTop: 18, padding: '14px 16px', background: 'var(--ink-900)',
            color: 'var(--paper-0)', borderRadius: 4,
          }}>
            <div className="mono" style={{ fontSize: 9.5, color: 'rgba(255,255,255,.6)', letterSpacing: '.14em', marginBottom: 6 }}>
              CORE METAPHOR
            </div>
            <div className="serif" style={{ fontSize: 16, fontStyle: 'italic', lineHeight: 1.45 }}>
              “红笔工坊” — 系统化的、可审计的副导师。
            </div>
          </div>
        </div>

        {/* Key moves */}
        <div>
          <div className="mono" style={{ fontSize: 10.5, letterSpacing: '.16em', color: 'var(--leaf-700)', fontWeight: 600, marginBottom: 10 }}>③ 三 步 关键改动</div>
          <div className="serif" style={{ fontSize: 19, fontWeight: 600, color: 'var(--ink-900)', marginBottom: 14, letterSpacing: -.2 }}>
            从“看见”到“可控”
          </div>

          {[
            {
              k: 'Step 3', n: '体检 X 光',
              moves: [
                '左轴：结构骨架树<strong>边扫边长</strong>',
                '中央：文档处于玻璃罩下，扫描线 + 放大镜',
                '右轴：发现项实时入坞，规则色编码',
              ],
            },
            {
              k: 'Step 4', n: '红笔工坊',
              moves: [
                '可拖拽<strong>时间线 scrubber</strong>，任意定位 finding',
                '左侧 <strong>稿纸地图</strong> 显示全文修复分布',
                '每张卡片可<strong>批准 / 存疑</strong>，不再只能旁观',
              ],
            },
            {
              k: 'Step 5', n: '校对台',
              moves: [
                '按章节 / 类目<strong>批量批准或质询</strong>',
                '<strong>文本指纹证书</strong>固定在右侧，证明 0 篡改',
                '逐项放大对照，可回到 Step4 重看修复过程',
              ],
            },
          ].map(({ k, n, moves }, i) => (
            <div key={i} style={{
              padding: '12px 0', borderBottom: i < 2 ? '1px dashed var(--hair)' : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
                <span className="mono" style={{ fontSize: 10, color: 'var(--leaf-700)', fontWeight: 600, letterSpacing: '.1em' }}>{k}</span>
                <span className="serif" style={{ fontSize: 15.5, fontWeight: 600, color: 'var(--ink-900)' }}>{n}</span>
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {moves.map((m, j) => (
                  <li key={j} style={{
                    fontSize: 12, color: 'var(--ink-700)', lineHeight: 1.5,
                    paddingLeft: 12, position: 'relative',
                  }}>
                    <span style={{ position: 'absolute', left: 0, top: 9, width: 5, height: 1, background: 'var(--ink-400)' }} />
                    <span dangerouslySetInnerHTML={{ __html: m }} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Footer pact */}
      <div style={{
        position: 'absolute', left: 64, right: 64, bottom: 36,
        display: 'flex', gap: 0, borderTop: '1px solid var(--hair)',
        paddingTop: 16,
      }}>
        {[
          ['元 子 集', '页面/封面/摘要/目录/标题/段落/图/题/表/续表/文献/页眉脚/页码/附录'],
          ['红 线 三 联', '证据 → 规则 → 修改'],
          ['交 付 门 槛', '0 篡改 · ≥98% 命中 · ≤30s · 可回退'],
        ].map(([k, v], i, a) => (
          <div key={i} style={{
            flex: 1, paddingLeft: i === 0 ? 0 : 18, paddingRight: i === a.length - 1 ? 0 : 18,
            borderRight: i < a.length - 1 ? '1px solid var(--hair)' : 'none',
          }}>
            <div className="mono" style={{ fontSize: 9.5, letterSpacing: '.14em', color: 'var(--ink-400)', marginBottom: 6 }}>
              {k}
            </div>
            <div className="serif" style={{ fontSize: 13, color: 'var(--ink-900)' }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

window.RedesignBrief = RedesignBrief;
