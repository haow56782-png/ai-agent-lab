import React from 'react';

interface ShareModalProps {
  score: number;
  totalIssues: number;
  fixableIssues: number;
  schoolName: string;
  collegeName: string;
  onClose: () => void;
  onCopyLink: () => void;
  onGeneratePoster: () => void;
}

const TOP_ISSUES = [
  '正文行距不符合规范',
  '英文字体不统一（47 处）',
  '标题层级缺失',
  '页码格式错误',
];

const ShareModal: React.FC<ShareModalProps> = ({
  score, totalIssues, fixableIssues, schoolName, collegeName,
  onClose, onCopyLink, onGeneratePoster,
}) => {
  const scoreColor = score < 60 ? 'var(--rust-500)' : score < 80 ? 'var(--sun-500)' : 'var(--leaf-500)';
  const scoreBg = score < 60 ? 'var(--rust-100)' : score < 80 ? 'var(--sun-100)' : 'var(--leaf-100)';

  return (
    <div className="modal-backdrop" style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(21,23,27,.5)',
      animation: 'protoFade .15s ease',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--paper-0)', borderRadius: 6,
        width: 440, maxHeight: '85vh', overflow: 'auto',
        boxShadow: 'var(--shadow-card)',
        animation: 'protoFadeUp .2s ease',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 22px', borderBottom: '1px solid var(--hair)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>📤</span>
            <span className="serif" style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink-900)' }}>分享这次交稿进度</span>
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 14, border: 'none',
            background: 'var(--paper-2)', cursor: 'pointer', fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--ink-500)',
          }}>✕</button>
        </div>

        {/* Share card preview */}
        <div style={{ padding: '20px 22px' }}>
          <div style={{
            background: 'var(--paper-1)', borderRadius: 6, border: '1px solid var(--hair)',
            padding: '20px 22px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 10, color: 'var(--ink-400)', letterSpacing: '.14em', marginBottom: 10 }}>
              remei · 论文交稿进度
            </div>
            <div style={{
              width: 80, height: 80, borderRadius: 40,
              background: scoreBg, border: `3px solid ${scoreColor}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 10px',
            }}>
              <span className="mono num" style={{ fontSize: 28, fontWeight: 700, color: scoreColor, lineHeight: 1 }}>
                {score}
              </span>
              <span className="mono" style={{ fontSize: 10, color: scoreColor, opacity: .7 }}>/ 100</span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink-900)', marginBottom: 2 }}>
              发现 {totalIssues} 个排版风险点
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-500)', marginBottom: 10 }}>
              其中 {fixableIssues} 个可以自动推进处理
            </div>
            {schoolName && (
              <div className="mono" style={{ fontSize: 11, color: 'var(--brand-700)', marginBottom: 12 }}>
                {schoolName} · {collegeName}
              </div>
            )}

            <div style={{
              borderTop: '1px dashed var(--hair)', paddingTop: 12, marginTop: 4,
              textAlign: 'left',
            }}>
              <div className="mono" style={{ fontSize: 9.5, letterSpacing: '.12em', color: 'var(--ink-400)', marginBottom: 6 }}>
                当前重点
              </div>
              {TOP_ISSUES.map((issue, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0',
                  fontSize: 12, color: 'var(--ink-700)',
                }}>
                  <span style={{ color: 'var(--rust-600)', fontSize: 11 }}>✗</span>
                  {issue}
                </div>
              ))}
              <div style={{ fontSize: 12, color: 'var(--ink-400)', marginTop: 3 }}>
                ... 还有 {Math.max(totalIssues - 4, 0)} 个细节在继续收口
              </div>
            </div>
          </div>

          {/* Social proof */}
          <div style={{
            marginTop: 12, fontSize: 12, color: 'var(--ink-500)', textAlign: 'center',
            padding: '8px 12px', background: 'var(--brand-50)', borderRadius: 4,
          }}>
            已有 12,847 位同学用它把论文往毕业终点再推近一步
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button onClick={onCopyLink} style={{
              flex: 1, height: 40, borderRadius: 4,
              border: '1px solid var(--hair-strong)', background: 'var(--paper-0)',
              fontSize: 13, fontWeight: 500, fontFamily: 'var(--sans)',
              cursor: 'pointer', color: 'var(--ink-700)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              🔗 复制进度链接
            </button>
            <button onClick={onGeneratePoster} style={{
              flex: 1, height: 40, borderRadius: 4,
              border: 'none', background: 'var(--ink-900)', color: 'var(--paper-0)',
              fontSize: 13, fontWeight: 600, fontFamily: 'var(--sans)',
              cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              🖼 生成上岸海报
            </button>
          </div>

          <div style={{
            marginTop: 10, padding: '8px 10px', background: 'var(--sun-100)', borderRadius: 3,
            fontSize: 11, color: 'var(--sun-700)', lineHeight: 1.4,
          }}>
            💡 分享的只是处理进度，不会泄露你的姓名、学号和论文标题。
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
