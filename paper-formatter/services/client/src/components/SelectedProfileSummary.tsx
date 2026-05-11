import React from 'react';
import { Btn } from './Common';
import type { SchoolOption } from './AppFrame';
import { ProfileField } from './ProfileField';

interface SelectedProfileSummaryProps {
  profile: SchoolOption;
  effectiveFromLabel: string;
  onShowRules: () => void;
  onStartParse: () => void;
}

export const SelectedProfileSummary: React.FC<SelectedProfileSummaryProps> = ({
  profile,
  effectiveFromLabel,
  onShowRules,
  onStartParse,
}) => (
  <>
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
      <div style={{
        width: 44, height: 44, borderRadius: 22, background: profile.accent,
        color: 'var(--paper-0)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 600,
      }}>{profile.initial}</div>
      <div style={{ flex: 1 }}>
        <div className="serif" style={{ fontSize: 20, fontWeight: 600, color: 'var(--ink-900)', letterSpacing: -.2 }}>
          {profile.name} · {profile.faculty}
        </div>
        <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-500)', marginTop: 4, letterSpacing: '.04em' }}>
          profile · {profile.version} · 生效 {effectiveFromLabel} · {profile.rules} 条规则
        </div>
      </div>
      <span className="chip leaf">准备应用</span>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
      <ProfileField label="规则版本" value={`${profile.version} (现行)`} arrow />
      <ProfileField label="国家标准基线" value={profile.baseStandardVersion || 'GB/T 7713.1-2006'} arrow accent />
    </div>
    <div style={{
      padding: '10px 12px', background: 'var(--brand-50)', borderRadius: 4,
      fontSize: 12, color: 'var(--ink-600)', lineHeight: 1.55, marginBottom: 14,
    }}>
      <span style={{ fontWeight: 600, color: 'var(--brand-700)' }}>应用逻辑：</span>
      <span>所选规则包会叠加在国标基线之上生效。你现在确定的，是这篇论文走向“符合本校提交标准”的具体路线。</span>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
      <ProfileField label="规则来源" value={profile.sourceType === 'learned' ? '自动学习' : '官方规则'} />
      <ProfileField label="生效日期" value={effectiveFromLabel} />
      <ProfileField label="覆盖度" value={`${profile.match}%`} />
    </div>

    <div className="hrule" />

    <div style={{ flex: 1, overflow: 'auto', paddingTop: 14 }}>
      <div style={{ fontSize: 10, color: 'var(--ink-400)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 8 }}>交稿规则速览</div>
      {[
        ['A. 页面基础', 'A4 · 上 25 / 下 25 / 左 30 / 右 25 mm · 装订线 0'],
        ['I. 正文段落', '宋体 / Times New Roman · 小四 · 1.5 倍行距 · 首行 2 字符'],
        ['H. 章节标题', '黑体 · 三号 · 段前 24 段后 18 · 居中'],
        ['M. 图片 / L. 表格', '图题宋体五号置图下 · 三线表 · 章号编号'],
        ['E. / F. 摘要', '中英文摘要独立分节 · 罗马数字页码'],
        ['J. 页眉页码', '阿拉伯数字 · 1 起 · 页脚居中 · 章眉'],
        ['O. 参考文献', 'GB/T 7714-2015 · 顺序编码制 · 悬挂缩进'],
      ].map(([k, v], i, a) => (
        <div key={i} style={{
          display: 'grid', gridTemplateColumns: '110px 1fr', gap: 12,
          padding: '8px 0', borderBottom: i < a.length - 1 ? '1px dashed var(--hair)' : 'none',
          fontSize: 12, alignItems: 'baseline',
        }}>
          <div className="mono" style={{ color: 'var(--ink-500)', fontSize: 11, letterSpacing: '.02em' }}>{k}</div>
          <div style={{ color: 'var(--ink-700)' }}>{v}</div>
        </div>
      ))}
    </div>

    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '14px 0', borderTop: '1px solid var(--hair)',
    }}>
      <span className="mono" style={{ fontSize: 11, color: 'var(--ink-500)' }}>预计会按这套规则应用 {profile.rules} 项排版要求</span>
      <div style={{ display: 'flex', gap: 8 }}>
        <Btn kind="ghost" onClick={onShowRules}>查看完整规则</Btn>
        <Btn kind="primary" icon="sparkle" onClick={onStartParse}>按这套规范开始解析</Btn>
      </div>
    </div>
  </>
);
