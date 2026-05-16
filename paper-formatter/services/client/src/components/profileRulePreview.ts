import type { ProfileRuleEntry, SchoolProfile } from '../api/client';

export interface ProfilePreviewRow {
  key: string;
  label: string;
  value: string;
  hasStructuredValue: boolean;
  category: string;
  categoryCode: string;
  source?: string;
  thesisSubset?: string;
  targetObject?: string;
  uiSection?: string;
}

export interface ProfileRuleGroup {
  category: string;
  categoryCode: string;
  rows: ProfilePreviewRow[];
}

function formatValue(value: unknown, unit?: string): string {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).join(' / ');
  }
  if (value == null || value === '') return unit ? `0 ${unit}` : '未标注';
  if (typeof value === 'number') {
    const normalized = Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
    return unit ? `${normalized} ${unit}` : normalized;
  }
  if (typeof value === 'boolean') {
    return value ? '是' : '否';
  }
  return unit ? `${String(value)} ${unit}` : String(value);
}

function humanizeRuleId(ruleId?: string): string {
  if (!ruleId) return '未命名规则';
  return ruleId
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

const INTERNAL_RULE_FIELDS = new Set([
  'ruleId',
  'label',
  'unit',
  'category',
  'categoryCode',
  'source',
  'type',
  'description',
  'thesisSubset',
  'targetObject',
  'uiSection',
  'condition',
  'expectedFormat',
  'priority',
  'conflictPolicy',
  'warningCode',
  'fixable',
  'autoFixStrategy',
  'evidence',
]);

function formatEntryValue(entry: ProfileRuleEntry): string {
  if (Array.isArray(entry.allowedFonts) && entry.allowedFonts.length > 0) {
    return entry.allowedFonts.join(' / ');
  }
  if (entry.value !== undefined) {
    return formatValue(entry.value, typeof entry.unit === 'string' ? entry.unit : undefined);
  }

  const candidateKeys = Object.keys(entry).filter((key) => !INTERNAL_RULE_FIELDS.has(key));
  const values = candidateKeys
    .map((key) => entry[key])
    .filter((value) => value !== undefined && value !== null && value !== '');

  if (values.length === 0) return '已纳入校验';
  if (values.length === 1) return formatValue(values[0]);
  return values.map((value) => formatValue(value)).join(' · ');
}

function hasStructuredValue(entry: ProfileRuleEntry): boolean {
  if (Array.isArray(entry.allowedFonts) && entry.allowedFonts.length > 0) return true;
  if (entry.value !== undefined) return true;
  const candidateKeys = Object.keys(entry).filter((key) => !INTERNAL_RULE_FIELDS.has(key));
  return candidateKeys.some((key) => entry[key] !== undefined && entry[key] !== null && entry[key] !== '');
}

function buildRows(entries: ProfileRuleEntry[]): ProfilePreviewRow[] {
  return entries.map((entry, index) => ({
    key: `${entry.ruleId || entry.label || 'rule'}-${index}`,
    label: (typeof entry.description === 'string' && entry.description.trim())
      ? entry.description
      : entry.label || humanizeRuleId(entry.ruleId),
    value: formatEntryValue(entry),
    hasStructuredValue: hasStructuredValue(entry),
    category: typeof entry.category === 'string' ? entry.category : '未分类规则',
    categoryCode: typeof entry.categoryCode === 'string' ? entry.categoryCode : 'Z',
    source: typeof entry.source === 'string' ? entry.source : undefined,
    thesisSubset: typeof entry.thesisSubset === 'string' ? entry.thesisSubset : undefined,
    targetObject: typeof entry.targetObject === 'string' ? entry.targetObject : undefined,
    uiSection: typeof entry.uiSection === 'string' ? entry.uiSection : undefined,
  }));
}

export function buildProfilePreviewRows(profileDetail?: SchoolProfile | null, limit = 7): ProfilePreviewRow[] {
  if (!profileDetail) return [];
  const rules = buildRows(profileDetail.rulesJson || []);
  const styles = buildRows(profileDetail.styleMap || []);
  return [...rules, ...styles].slice(0, limit);
}

export function buildProfileRuleGroups(profileDetail?: SchoolProfile | null): ProfileRuleGroup[] {
  if (!profileDetail) return [];
  const rows = [
    ...buildRows(profileDetail.rulesJson || []),
    ...buildRows(profileDetail.styleMap || []),
  ];
  const groups = new Map<string, ProfileRuleGroup>();
  for (const row of rows) {
    const key = `${row.categoryCode}:${row.category}`;
    const group = groups.get(key) || {
      category: row.category,
      categoryCode: row.categoryCode,
      rows: [],
    };
    group.rows.push(row);
    groups.set(key, group);
  }
  return [...groups.values()].sort((left, right) => left.categoryCode.localeCompare(right.categoryCode));
}

export function getProfileRuleStats(profileDetail?: SchoolProfile | null): {
  totalRules: number;
  structuredRuleCount: number;
  styleRuleCount: number;
  hasRules: boolean;
  categoryCount: number;
} {
  const structuredRuleCount = profileDetail?.rulesJson?.length || 0;
  const styleRuleCount = profileDetail?.styleMap?.length || 0;
  const categoryCount = buildProfileRuleGroups(profileDetail).length;
  return {
    totalRules: structuredRuleCount + styleRuleCount,
    structuredRuleCount,
    styleRuleCount,
    hasRules: structuredRuleCount + styleRuleCount > 0,
    categoryCount,
  };
}
