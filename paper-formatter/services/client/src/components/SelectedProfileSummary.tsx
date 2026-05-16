import React from 'react';
import { Btn } from './Common';
import type { SchoolOption } from './AppFrame';
import { ProfileField } from './ProfileField';
import type { SchoolProfile } from '../api/client';
import { buildProfilePreviewRows, getProfileRuleStats } from './profileRulePreview';
import { getProfileSourceMeta } from './profileSourceMeta';

interface SelectedProfileSummaryProps {
  profile: SchoolOption;
  profileDetail?: SchoolProfile | null;
  loading?: boolean;
  effectiveFromLabel: string;
  onShowRules: () => void;
  onStartParse: () => void;
}

export const SelectedProfileSummary: React.FC<SelectedProfileSummaryProps> = ({
  profile,
  profileDetail,
  loading = false,
  effectiveFromLabel,
  onShowRules,
  onStartParse,
}) => {
  const profileTitle = [profile.name, profile.faculty].filter(Boolean).join(' · ');
  const previewRows = buildProfilePreviewRows(profileDetail);
  const ruleStats = getProfileRuleStats(profileDetail);
  const sourceMeta = getProfileSourceMeta({
    sourceType: profile.sourceType,
    rules: ruleStats.totalRules || profile.rules,
  });

  return (
    <>
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
      <div style={{
        width: 44, height: 44, borderRadius: 22, background: profile.accent,
        color: 'var(--paper-0)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 600,
      }}>{profile.initial}</div>
      <div style={{ flex: 1 }}>
        <div className="serif" style={{ fontSize: 20, fontWeight: 600, color: 'var(--ink-900)', letterSpacing: -.2 }}>
          {profileTitle}
        </div>
        <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-500)', marginTop: 4, letterSpacing: '.04em' }}>
          profile · {profile.version} · 生效 {effectiveFromLabel} · {ruleStats.totalRules || profile.rules} 条规则{ruleStats.categoryCount ? ` · ${ruleStats.categoryCount} 类` : ''}
        </div>
      </div>
      <span className={`chip ${sourceMeta.chipClassName}`}>{sourceMeta.label}</span>
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
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
      <ProfileField label="规则来源" value={sourceMeta.label} />
      <ProfileField label="规则状态" value={sourceMeta.description} />
      <ProfileField label="生效日期" value={effectiveFromLabel} />
      <ProfileField label="覆盖度" value={`${profile.match}%`} />
    </div>

    <div className="hrule" />

    <div style={{ flex: 1, overflow: 'auto', paddingTop: 14 }}>
      <div style={{ fontSize: 10, color: 'var(--ink-400)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 8 }}>交稿规则速览</div>
      {loading ? (
        <div style={{ padding: '10px 0', fontSize: 12, color: 'var(--ink-500)' }}>
          正在读取这套学校规范的真实规则条目…
        </div>
      ) : ruleStats.hasRules ? previewRows.map((row, i, a) => (
        <div key={i} style={{
          display: row.hasStructuredValue ? 'grid' : 'block',
          gridTemplateColumns: row.hasStructuredValue ? '110px 1fr' : undefined,
          gap: row.hasStructuredValue ? 12 : undefined,
          padding: '8px 0', borderBottom: i < a.length - 1 ? '1px dashed var(--hair)' : 'none',
          fontSize: 12, alignItems: 'baseline',
        }}>
          {row.hasStructuredValue ? (
            <>
              <div className="mono" style={{ color: 'var(--ink-500)', fontSize: 11, letterSpacing: '.02em' }}>{row.label}</div>
              <div style={{ color: 'var(--ink-700)' }}>{row.value}</div>
            </>
          ) : (
            <div style={{ color: 'var(--ink-700)', lineHeight: 1.65 }}>{row.label}</div>
          )}
        </div>
      )) : (
        <div
          style={{
            border: '1px dashed var(--hair)',
            borderRadius: 6,
            padding: '14px 12px',
            background: 'var(--paper-1)',
            color: 'var(--ink-600)',
            fontSize: 12,
            lineHeight: 1.7,
          }}
        >
          <div style={{ fontWeight: 600, color: 'var(--ink-800)', marginBottom: 6 }}>这所学校已经识别出来了，但规则包还没录入系统。</div>
          <div>现在看到的是学校名和档案壳，不代表已经具备可执行的交稿规范。继续解析前，建议先补规则或改选已有规范包。</div>
        </div>
      )}
    </div>

    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '14px 0', borderTop: '1px solid var(--hair)',
    }}>
      <span className="mono" style={{ fontSize: 11, color: 'var(--ink-500)' }}>
        {ruleStats.hasRules
          ? `预计会按这套规则应用 ${ruleStats.totalRules} 项、${ruleStats.categoryCount} 类排版要求`
          : '这套学校档案还没有可执行规则，继续前建议先补齐规范包'}
      </span>
      <div style={{ display: 'flex', gap: 8 }}>
        <Btn kind="ghost" onClick={onShowRules}>查看完整规则</Btn>
        <Btn kind="primary" icon="sparkle" onClick={onStartParse}>按这套规范开始解析</Btn>
      </div>
    </div>
  </>
  );
};
