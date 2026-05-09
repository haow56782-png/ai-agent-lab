import React from 'react';
import { Icon, LogoMark } from './Common';
import type { RuleHitItem } from '../api/client';

export type { RuleHitItem };

export interface ParseResult {
  items: { k: string; conf: number }[];
  log: string[];
  rules: { passed: number; warnings: number; failed: number };
  ruleDetails: { cat: string; items: (RuleHitItem | [string, 'pass' | 'warn'])[] }[];
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

export interface AppState {
  step: number;
  doc: { name: string; size: string; pages: number } | null;
  rawFile: File | null;
  docId: string | null;
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
  docId: null,
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

// ── Sidebar ────────────────────────────────────────────────
export const Sidebar: React.FC<{ state: AppState }> = ({ state }) => {
  const navItems = [
    { k: 'workbench', label: '工作台', icon: 'home' },
  ];
  const pct = (state.step - 1) * 25 + (state.step === 3 ? state.parsePct * .25 : state.step === 5 ? 25 : 0);
  const school = findSchoolById(state.schoolId);

  return (
    <aside style={{
      background: 'var(--ink-900)', color: 'var(--paper-1)',
      display: 'flex', flexDirection: 'column',
      padding: '22px 16px 18px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28, padding: '0 4px' }}>
        <LogoMark />
        <div>
          <div className="serif" style={{ fontSize: 18, fontWeight: 600, lineHeight: 1, letterSpacing: -.2 }}>正稿</div>
          <div className="mono" style={{ fontSize: 9, color: 'rgba(255,255,255,.4)', letterSpacing: '.16em', marginTop: 3 }}>ZHENGGAO</div>
        </div>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 22 }}>
        {navItems.map(n => (
          <div key={n.k} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 10px', borderRadius: 4,
            background: n.k === 'workbench' ? 'rgba(255,255,255,.08)' : 'transparent',
            color: n.k === 'workbench' ? 'var(--paper-0)' : 'rgba(255,255,255,.62)',
            fontSize: 13.5, cursor: 'pointer',
            fontWeight: n.k === 'workbench' ? 500 : 400,
          }}>
            <Icon name={n.icon} size={15} />
            {n.label}
          </div>
        ))}
      </nav>

      {state.doc && (
        <>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: 8, padding: '0 10px' }}>正在进行</div>
          <div style={{
            padding: '10px 10px', background: 'rgba(255,255,255,.05)', borderRadius: 4,
            display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14,
          }}>
            <div style={{
              fontSize: 12, color: 'var(--paper-0)', fontWeight: 500, lineHeight: 1.3,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>{state.doc.name}</div>
            <div className="mono" style={{ fontSize: 10, color: 'rgba(255,255,255,.5)' }}>
              {school ? school.name : '浏览模式 · 仅查看文档结构'}
            </div>
            <div style={{ marginTop: 6, height: 3, background: 'rgba(255,255,255,.1)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${pct}%`, background: 'var(--rust-500)',
                transition: 'width .35s cubic-bezier(.2,.8,.2,1)',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: 9.5, color: 'rgba(255,255,255,.5)' }}>
              <span>第 {state.step} 步</span>
              <span>{Math.round(pct)}%</span>
            </div>
          </div>
        </>
      )}

      <div style={{ flex: 1 }} />

      <div style={{
        padding: '12px 12px', border: '1px solid rgba(255,255,255,.12)', borderRadius: 4,
        fontSize: 11, lineHeight: 1.5, color: 'rgba(255,255,255,.6)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--leaf-500)' }} />
          <span className="mono" style={{ fontSize: 9.5, letterSpacing: '.14em', color: 'rgba(255,255,255,.65)' }}>USER PACT</span>
        </div>
        只改格式 · 不改内容 · 输出可回退
      </div>
    </aside>
  );
};

// ── TopBar ─────────────────────────────────────────────────
export const TopBar: React.FC<{
  state: AppState;
  onStep: (s: number) => void;
  onReset: () => void;
}> = ({ state, onStep, onReset }) => {
  const steps = ['上传论文', '选择学校', '格式体检', '一键修复', '查看修改', '下载定稿'];
  const reachable = (i: number) => {
    if (i === 0) return true;
    if (i === 1) return !!state.doc;
    if (i === 2) return !!state.doc;
    if (i === 3) return state.parseDone;
    if (i === 4) return false; // Fix → Diff — only after fix complete (handled by Step4Fix)
    if (i === 5) return state.exported;
    return false;
  };
  const school = findSchoolById(state.schoolId);

  // P2-1: Track step timestamps for timing labels
  const stepEntryRef = React.useRef<Record<number, number>>({});
  const [stepDurations, setStepDurations] = React.useState<Record<number, number>>({});

  React.useEffect(() => {
    const cur = state.step;
    // Record entry time for current step if not already set
    if (!stepEntryRef.current[cur]) {
      stepEntryRef.current[cur] = Date.now();
    }
    // Log duration for previous step when step advances
    const prevStep = cur > 1 ? cur - 1 : -1;
    if (prevStep > 0 && stepEntryRef.current[prevStep]) {
      const dur = Date.now() - stepEntryRef.current[prevStep];
      if (!stepDurations[prevStep] || dur > 0) {
        setStepDurations(prev => ({ ...prev, [prevStep]: dur }));
      }
    }
  }, [state.step]);

  // Capture duration when parse completes
  React.useEffect(() => {
    if (state.parseDone && stepEntryRef.current[3]) {
      const dur = Date.now() - stepEntryRef.current[3];
      setStepDurations(prev => prev[3] ? prev : { ...prev, [3]: Math.max(dur, 600) });
    }
  }, [state.parseDone]);

  const fmtTime = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <header style={{
      height: 56, padding: '0 28px',
      display: 'flex', alignItems: 'center', gap: 22,
      borderBottom: '1px solid var(--hair)',
      background: 'var(--paper-0)',
      flex: '0 0 auto',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '0 0 auto', minWidth: 0 }}>
        <Icon name="file" size={16} />
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: 500, color: 'var(--ink-900)', lineHeight: 1.1,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 320,
          }}>
            {state.doc ? state.doc.name : '新建任务 — 选择文档开始'}
          </div>
          <div className="mono" style={{ fontSize: 10, color: 'var(--ink-500)', marginTop: 2 }}>
            {school ? `${school.name} · ${school.faculty} · ${school.version}` : '浏览模式 · 仅查看文档结构，不修改格式'}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {steps.map((s, i) => {
            const active = i === state.step - 1;
            const done = i < state.step - 1;
            const can = reachable(i);
            const timing = done && stepDurations[i + 1] ? fmtTime(stepDurations[i + 1]) : null;
            return (
              <React.Fragment key={s}>
                {i > 0 && <span style={{
                  width: 16, height: 1,
                  background: i <= state.step - 1 ? 'var(--ink-700)' : 'var(--hair-strong)',
                  transition: 'background .25s',
                }} />}
                <button
                  disabled={!can}
                  onClick={() => can && onStep(i + 1)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    border: 'none', background: 'transparent', padding: '4px 6px', borderRadius: 4,
                    cursor: can ? 'pointer' : 'not-allowed',
                    opacity: can ? 1 : .55,
                    fontFamily: 'var(--sans)',
                  }}
                >
                  <span style={{
                    width: 18, height: 18, borderRadius: 9,
                    border: `1.4px solid ${active || done ? 'var(--ink-900)' : 'var(--ink-300)'}`,
                    background: done ? 'var(--ink-900)' : active ? 'var(--brand-700)' : 'transparent',
                    color: done || active ? 'var(--paper-0)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 600, fontFamily: 'var(--mono)',
                    transition: 'all .25s',
                    animation: active ? 'protoPulse 2s ease-in-out infinite' : 'none',
                  }}>{done ? '✓' : i + 1}</span>
                  <span style={{
                    fontSize: 12,
                    color: active ? 'var(--ink-900)' : 'var(--ink-500)',
                    fontWeight: active ? 600 : 400,
                  }}>{s}</span>
                  {timing && <span className="mono" style={{
                    fontSize: 9, color: 'var(--ink-400)', marginLeft: 2, letterSpacing: '.04em',
                  }}>{timing}</span>}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={onReset} style={{
          height: 28, padding: '0 10px', borderRadius: 4,
          border: '1px solid var(--hair-strong)', background: 'transparent',
          fontSize: 11, color: 'var(--ink-500)', cursor: 'pointer',
          fontFamily: 'var(--mono)', letterSpacing: '.06em',
        }}>↺ RESET</button>
        <div style={{
          width: 32, height: 32, borderRadius: 16,
          background: 'var(--brand-700)', color: 'var(--paper-0)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 600,
        }}>陈</div>
      </div>
    </header>
  );
};
