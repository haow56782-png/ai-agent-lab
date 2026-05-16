import type { SchoolOption } from './AppFrame';

export type RuleStatusFilter = 'all' | 'official' | 'learned' | 'pending';

export function getProfileRuleStatus(profile: Pick<SchoolOption, 'sourceType' | 'rules'>): Exclude<RuleStatusFilter, 'all'> {
  const hasRules = (profile.rules || 0) > 0;
  if (!hasRules || profile.sourceType === 'detected') return 'pending';
  if (profile.sourceType === 'learned') return 'learned';
  return 'official';
}

export function getProfileSourceMeta(profile: Pick<SchoolOption, 'sourceType' | 'rules'>): {
  status: Exclude<RuleStatusFilter, 'all'>;
  label: string;
  description: string;
  chipClassName: string;
} {
  const status = getProfileRuleStatus(profile);
  if (status === 'pending') {
    return {
      status,
      label: '待补规则',
      description: '已识别学校名，规则包待补齐',
      chipClassName: 'sun',
    };
  }
  if (status === 'learned') {
    return {
      status,
      label: '自动学习',
      description: '由上传范文或模板反推规则',
      chipClassName: 'brand',
    };
  }
  return {
    status,
    label: '官方规则',
    description: '已录入可执行规范包',
    chipClassName: 'leaf',
  };
}
