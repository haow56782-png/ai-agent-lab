import React from 'react';
import type { RuleHitItem } from '../api/client';
import type { FindingContract } from '../api/client';

export type { RuleHitItem };

export interface ParseResult {
  items: { k: string; conf: number }[];
  log: string[];
  rules: { passed: number; warnings: number; failed: number };
  ruleDetails: { cat: string; items: (RuleHitItem | [string, 'pass' | 'warn'])[] }[];
  findings?: FindingContract[];
  parsedTexts?: string[];
  rawHeadings?: string[];
}

export interface SchoolOption {
  id: string;
  name: string;
  faculty: string;
  match: number;
  rules: number;
  version: string;
  initial: string;
  accent: string;
  baseStandardVersion?: 'GB/T 7713.1-2006' | 'GB/T 7713.1-2025';
  effectiveFrom?: string;
  sourceType?: 'official' | 'learned';
  uploadCount?: number;
}

export interface DetectedSchool {
  name: string;
  confidence: number;
  isNew: boolean;
  existingSchoolId: string | null;
}

export interface DocumentIdentity {
  legacyDocId: string;
  canonicalDocumentId: string | null;
}

export interface AppState {
  step: number;
  doc: { name: string; size: string; pages: number } | null;
  rawFile: File | null;
  documentIdentity: DocumentIdentity | null;
  jobId: string | null;
  jobStatus: string | null;
  uploadPct: number;
  uploadStage: 'idle' | 'reading' | 'done';
  schoolId: string | null;
  parsePct: number;
  parsePhase: number;
  parseDone: boolean;
  parseResults: ParseResult | null;
  exporting: boolean;
  exported: boolean;
  diffPage: number;
  activeRuleId: string | null;
  showRulesModal: boolean;
  draftSchool: {
    id: string;
    name: string;
    faculty: string;
    rules: number;
    match: number;
    baseStandardVersion?: 'GB/T 7713.1-2006' | 'GB/T 7713.1-2025';
  } | null;
  detectedSchool: DetectedSchool | null;
  detecting: boolean;
}

export const initialState: AppState = {
  step: 1,
  doc: null,
  rawFile: null,
  documentIdentity: null,
  jobId: null,
  jobStatus: null,
  uploadPct: 0,
  uploadStage: 'idle',
  schoolId: null,
  parsePct: 0,
  parsePhase: 0,
  parseDone: false,
  parseResults: null,
  exporting: false,
  exported: false,
  diffPage: 3,
  activeRuleId: null,
  showRulesModal: false,
  draftSchool: null,
  detectedSchool: null,
  detecting: false,
};

export function createDocumentIdentity(input: {
  legacyDocId: string;
  canonicalDocumentId?: string | null;
}): DocumentIdentity {
  return {
    legacyDocId: input.legacyDocId,
    canonicalDocumentId: input.canonicalDocumentId ?? null,
  };
}

export function getLegacyDocumentId(state: Pick<AppState, 'documentIdentity'>): string | null {
  return state.documentIdentity?.legacyDocId ?? null;
}

export function getCanonicalDocumentId(state: Pick<AppState, 'documentIdentity'>): string | null {
  const identity = state.documentIdentity;
  if (!identity) return null;
  return identity.canonicalDocumentId || identity.legacyDocId;
}

export function isDemoDocument(state: Pick<AppState, 'documentIdentity'>): boolean {
  return state.documentIdentity?.legacyDocId === 'demo';
}

export const DEMO_DOC = {
  name: '基于深度学习的图像超分辨率重建研究.docx',
  size: '1.8 MB',
  pages: 87,
};

export const SCHOOLS = [
  { id: 'thu',  name: '清华大学',         faculty: '计算机科学与技术系',         match: 100, rules: 145, version: 'v2024.09', initial: '清', accent: 'var(--brand-700)', baseStandardVersion: 'GB/T 7713.1-2006', effectiveFrom: '2024-09-01', sourceType: 'official' },
  { id: 'pku',  name: '北京大学',         faculty: '元培学院 · 通用规范',         match: 96,  rules: 132, version: 'v2024.07', initial: '北', accent: 'var(--rust-500)', baseStandardVersion: 'GB/T 7713.1-2006', effectiveFrom: '2024-07-01', sourceType: 'official' },
  { id: 'tjp',  name: '同济大学',         faculty: '软件学院',                     match: 94,  rules: 128, version: 'v2024.03', initial: '同', accent: 'var(--leaf-500)', baseStandardVersion: 'GB/T 7713.1-2006', effectiveFrom: '2024-03-01', sourceType: 'official' },
  { id: 'fdu',  name: '复旦大学',         faculty: '管理学院',                     match: 91,  rules: 124, version: 'v2024.01', initial: '复', accent: 'var(--sun-500)', baseStandardVersion: 'GB/T 7713.1-2006', effectiveFrom: '2024-01-01', sourceType: 'official' },
  { id: 'cafa', name: '中央美术学院',     faculty: '美术学系',                     match: 87,  rules: 108, version: 'v2023.10', initial: '央', accent: 'var(--brand-500)', baseStandardVersion: 'GB/T 7713.1-2006', effectiveFrom: '2023-10-01', sourceType: 'official' },
  { id: 'sjtu', name: '上海交通大学',     faculty: '电子信息与电气工程学院',       match: 93,  rules: 136, version: 'v2024.05', initial: '交', accent: 'var(--ink-700)', baseStandardVersion: 'GB/T 7713.1-2006', effectiveFrom: '2024-05-01', sourceType: 'official' },
  { id: 'cqccst', name: '重庆城市科技学院', faculty: '经济管理学院',               match: 89,  rules: 122, version: 'v2021.06', initial: '重', accent: 'var(--rust-500)', baseStandardVersion: 'GB/T 7713.1-2006', effectiveFrom: '2021-06-01', sourceType: 'official' },
];

const LEARNED_SCHOOLS_KEY = 'zhenggao_learned_schools';

function safeReadLearnedSchools(): SchoolOption[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LEARNED_SCHOOLS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeWriteLearnedSchools(items: SchoolOption[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LEARNED_SCHOOLS_KEY, JSON.stringify(items));
}

function normalizeSchoolName(value: string): string {
  return value.replace(/\s+/g, '').trim().toLowerCase();
}

function makeInitial(name: string): string {
  return name.trim().slice(0, 1) || '校';
}

function accentByIndex(index: number): string {
  return ['var(--brand-700)', 'var(--rust-500)', 'var(--leaf-500)', 'var(--sun-500)', 'var(--brand-500)', 'var(--ink-700)'][index % 6];
}

export type BaseStandardVersion = 'GB/T 7713.1-2006' | 'GB/T 7713.1-2025';

export function defaultBaseStandardVersion(): BaseStandardVersion {
  const switchDate = new Date('2026-02-01T00:00:00+08:00').getTime();
  return Date.now() >= switchDate ? 'GB/T 7713.1-2025' : 'GB/T 7713.1-2006';
}

export function getSchoolOptions(): SchoolOption[] {
  const learned = safeReadLearnedSchools();
  const overrideMap = new Map(learned.map(item => [item.id, item]));
  const mergedBase = SCHOOLS.map((school) => overrideMap.get(school.id) || school);
  const extraLearned = learned.filter(item => !SCHOOLS.some(base => base.id === item.id));
  return [...mergedBase, ...extraLearned] as SchoolOption[];
}

export function findSchoolById(id?: string | null): SchoolOption | null {
  if (!id) return null;
  return getSchoolOptions().find(school => school.id === id) || null;
}

export function upsertLearnedSchool(input: {
  name: string;
  faculty: string;
  rules: number;
  initial?: string;
  id?: string;
  baseStandardVersion?: 'GB/T 7713.1-2006' | 'GB/T 7713.1-2025';
}): SchoolOption {
  const allSchools = getSchoolOptions();
  const normalizedName = normalizeSchoolName(input.name);
  const existing = allSchools.find(school => normalizeSchoolName(school.name) === normalizedName);
  const learned = safeReadLearnedSchools();
  const existingLearned = existing ? learned.find(item => item.id === existing.id) : undefined;
  const baseRules = existingLearned?.rules ?? existing?.rules ?? 0;
  const baseMatch = existingLearned?.match ?? existing?.match ?? 68;
  const nextRules = Math.max(baseRules, input.rules);
  const coverageBoost = baseRules > 0 ? 6 : 0;
  const nextMatch = Math.min(100, Math.max(baseMatch, Math.min(98, Math.round(baseMatch + coverageBoost + (input.rules - baseRules) / 6))));

  const record: SchoolOption = {
    id: existing?.id || input.id || `learned_${normalizeSchoolName(input.name).replace(/[^a-z0-9\u4e00-\u9fa5]/g, '').slice(0, 18) || Date.now().toString(36)}`,
    name: existing?.name || input.name,
    faculty: input.faculty || existing?.faculty || '上传范文模板',
    rules: nextRules,
    match: nextMatch,
    version: existing?.version || 'vAuto',
    initial: existing?.initial || input.initial || makeInitial(input.name),
    accent: existing?.accent || accentByIndex(learned.length),
    baseStandardVersion: existing?.baseStandardVersion || input.baseStandardVersion || defaultBaseStandardVersion(),
    effectiveFrom: existing?.effectiveFrom || new Date().toISOString().slice(0, 10),
    sourceType: existing?.sourceType || 'learned',
  };

  const nextLearned = learned.filter(item => item.id !== record.id).concat(record);
  safeWriteLearnedSchools(nextLearned);
  return record;
}

export const PARSE_PHASES = [
  { k: 'PRS', label: '解析 DOCX',     sub: 'Open XML · 样式表 · 节',        ms: 900 },
  { k: 'STR', label: '识别结构',       sub: '封面 / 摘要 / 目录 / 正文',     ms: 1300 },
  { k: 'REF', label: '识别图表 + 文献', sub: 'OCR · LayoutLM · 候选打分',     ms: 1100 },
  { k: 'CHK', label: '规则预匹配',     sub: '清华 · v2024.09 · 145 条',      ms: 700 },
];

// ── Context ────────────────────────────────────────────────
export const AppCtx = React.createContext<{
  state: AppState;
  set: (patch: Partial<AppState>) => void;
} | null>(null);

export function useApp() {
  const ctx = React.useContext(AppCtx);
  if (!ctx) throw new Error('useApp must be inside AppCtx.Provider');
  return ctx;
}
