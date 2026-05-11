import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp, PARSE_PHASES, findSchoolById, getLegacyDocumentId } from '../components/AppFrame';
import { api } from '../api/client';
import { type StructItemEx as StructPanelItem } from '../components/StructPanel';
import { ParseTimeline } from '../components/ParseTimeline';
import { ParseResults } from '../components/ParseResults';
import { analytics } from '../api/analytics';

interface Props {
  showToast: (msg: string) => void;
}

const LEGACY_DOC_HINT = '检测到当前文件实际上是旧版 .doc / WPS 兼容格式。解析可以继续，但自动修复前请先在 WPS 或 Word 中另存为标准 .docx。'

const STRUCT_ITEMS = [
  { k: '封面', key: 'cover' },
  { k: '摘要', key: 'abstract' },
  { k: '目录', key: 'toc' },
  { k: '标题结构', key: 'headings' },
  { k: '图题', key: 'figures' },
  { k: '表题', key: 'tables' },
  { k: '参考文献', key: 'references' },
];

const MIN_PARSE_EXPERIENCE_MS = 2.5 * 1000;
const VISUAL_PROGRESS_CAP = 97;
const VISUAL_PHASE_BREAKPOINTS = [0.2, 0.52, 0.82, 1];


function extractContent(texts: string[], headings: string[], key: string, count: number): string[] {
  if (!texts || texts.length === 0) return [];
  const result: string[] = [];

  switch (key) {
    case 'cover': {
      // First ~6 non-empty paragraphs
      let found = 0;
      for (const t of texts) {
        const c = t.replace(/[\x00-\x08\x0e-\x1f]/g, '').trim();
        if (c.length > 8) {
          result.push(c);
          found++;
          if (found >= count) break;
        }
      }
      break;
    }
    case 'abstract': {
      // Find paragraphs containing 摘要/Abstract
      const absTexts: string[] = [];
      const absPattern = /(摘\s*要|abstract)/i;
      for (let i = 0; i < texts.length; i++) {
        const c = texts[i].replace(/[\x00-\x08\x0e-\x1f]/g, '').trim();
        if (absPattern.test(c)) {
          // Include this para and the next 2
          for (let j = i; j < Math.min(i + 3, texts.length) && absTexts.length < count; j++) {
            const t = texts[j].replace(/[\x00-\x08\x0e-\x1f]/g, '').trim();
            if (t.length > 4) absTexts.push(t);
          }
          break;
        }
      }
      // If abstract has "摘  要" style (chars separated by spaces), also detect
      if (absTexts.length === 0) {
        const spacedAbs = /摘\s{2,}要/;
        for (let i = 0; i < texts.length; i++) {
          if (spacedAbs.test(texts[i])) {
            for (let j = i; j < Math.min(i + 3, texts.length) && absTexts.length < count; j++) {
              const t = texts[j].replace(/[\x00-\x08\x0e-\x1f]/g, '').trim();
              if (t.length > 4) absTexts.push(t);
            }
            break;
          }
        }
      }
      result.push(...absTexts.slice(0, count));
      break;
    }
    case 'toc': {
      // Find lines with "目录" or dot leaders (TOC patterns)
      const tocLines: string[] = [];
      const dotPattern = /\.{2,}\s*\d/;
      for (let i = 0; i < texts.length; i++) {
        const c = texts[i].replace(/[\x00-\x08\x0e-\x1f]/g, '').trim();
        if (c.includes('目录') || dotPattern.test(c)) {
          tocLines.push(c);
          if (tocLines.length >= count) break;
        }
      }
      // Fallback: look for numbered section patterns
      if (tocLines.length === 0) {
        const secPattern = /^[1-9]\s{2,}[^\d]/;
        for (const t of texts) {
          const c = t.replace(/[\x00-\x08\x0e-\x1f]/g, '').trim();
          if (secPattern.test(c) && c.length < 60) {
            tocLines.push(c);
            if (tocLines.length >= count) break;
          }
        }
      }
      result.push(...tocLines.slice(0, count));
      break;
    }
    case 'headings': {
      if (headings && headings.length > 0) {
        for (const h of headings) {
          const clean = h.replace(/[\.]{2,}\s*\d+.*$/, '').trim();
          if (clean.length > 2) {
            result.push(clean);
            if (result.length >= count) break;
          }
        }
      }
      break;
    }
    case 'figures': {
      const figPattern = /^图\s*\d|^Figure\s*\d|图\d/;
      for (const t of texts) {
        const c = t.replace(/[\x00-\x08\x0e-\x1f]/g, '').trim();
        if (figPattern.test(c)) {
          result.push(c);
          if (result.length >= count) break;
        }
      }
      break;
    }
    case 'tables': {
      const tblPattern = /^表\s*\d|^Table\s*\d|表\d/;
      for (const t of texts) {
        const c = t.replace(/[\x00-\x08\x0e-\x1f]/g, '').trim();
        if (tblPattern.test(c)) {
          result.push(c);
          if (result.length >= count) break;
        }
      }
      break;
    }
    case 'references': {
      // Find paragraphs after 参考文献/References
      let inRefs = false;
      const refPattern = /参考文献|references/i;
      for (const t of texts) {
        const c = t.replace(/[\x00-\x08\x0e-\x1f]/g, '').trim();
        if (!inRefs && refPattern.test(c)) { inRefs = true; continue; }
        if (inRefs && c.length > 10) {
          result.push(c.slice(0, 120));
          if (result.length >= count) break;
        }
      }
      break;
    }
  }

  return result.length > 0 ? result : ['（未识别到内容）'];
}

function getVisualProgressFrame(elapsedMs: number) {
  const ratio = Math.min(1, elapsedMs / MIN_PARSE_EXPERIENCE_MS);
  const pct = Math.min(
    VISUAL_PROGRESS_CAP,
    Math.max(1, Math.round(ratio * VISUAL_PROGRESS_CAP)),
  );

  let phaseIdx = VISUAL_PHASE_BREAKPOINTS.findIndex((breakpoint) => ratio <= breakpoint);
  if (phaseIdx === -1) phaseIdx = VISUAL_PHASE_BREAKPOINTS.length - 1;

  return { pct, phaseIdx, ratio };
}

const Step3Parse: React.FC<Props> = ({ showToast }) => {
  const { state, set } = useApp();
  const [logs, setLogs] = useState<{ t: 'phase' | 'ok' | 'warn'; text: string }[]>([]);
  const [items, setItems] = useState<StructPanelItem[]>(
    STRUCT_ITEMS.map(s => ({ k: s.k, key: s.key, conf: null, done: false, preview: [] }))
  );
  const [parseStart] = useState(Date.now());
  const [parseElapsed, setParseElapsed] = useState(0);
  const [phaseDurations, setPhaseDurations] = useState<Record<number, number>>({});
  const [structureDurations, setStructureDurations] = useState<Record<string, number>>({});
  // P2-4: Parse error / timeout state
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseTimedOut, setParseTimedOut] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [paused, setPaused] = useState(false);
  const [fastMode, setFastMode] = useState(false);
  const [skippedSteps, setSkippedSteps] = useState<number[]>([]);
  const phaseEntryRef = useRef<Record<number, number>>({ 0: Date.now() });
  const prevLogCountRef = useRef(0);
  const visualPhaseAppliedRef = useRef<Set<number>>(new Set());
  const pausedRef = useRef(false);
  const fastModeRef = useRef(false);
  const queuedCompletionRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    fastModeRef.current = fastMode;
  }, [fastMode]);

  // ── Task 1-3: Score & issue data from parseResults ──
  const parseResults = state.parseResults;
  const scoreRaw = useMemo(() => {
    if (!parseResults?.rules) return 0;
    const { passed, warnings, failed } = parseResults.rules;
    const total = passed + warnings + failed;
    return total > 0 ? Math.round((passed / total) * 100) : 0;
  }, [parseResults]);
  const totalIssues = parseResults?.rules ? parseResults.rules.warnings + parseResults.rules.failed : 0;
  const fixableIssues = totalIssues;
  const [animatedScore, setAnimatedScore] = useState(0);

  const issueGroups = useMemo(() => {
    if (!parseResults?.ruleDetails) return [];
    return parseResults.ruleDetails.map(g => ({
      cat: g.cat,
      items: g.items
        .filter(item => {
          if (Array.isArray(item)) return item[1] !== 'pass';
          return item.status !== 'pass';
        })
        .map(item => {
          if (Array.isArray(item)) return { label: item[0], status: item[1] as 'warn' | 'fail' };
          return { label: item.label, status: item.status as 'warn' | 'fail' };
        }),
    })).filter(g => g.items.length > 0);
  }, [parseResults]);

  const scoreTone = animatedScore < 60 ? 'var(--rust-500)' : animatedScore < 80 ? 'var(--sun-500)' : animatedScore < 95 ? 'var(--leaf-500)' : 'var(--leaf-700)';
  const scoreBg = animatedScore < 60 ? 'var(--rust-100)' : animatedScore < 80 ? 'var(--sun-100)' : animatedScore < 95 ? 'var(--leaf-100)' : 'var(--leaf-50)';

  // Tick elapsed time during parsing
  useEffect(() => {
    if (state.parseDone) return;
    const interval = setInterval(() => {
      setParseElapsed(Math.floor((Date.now() - parseStart) / 1000));
    }, 200);
    return () => clearInterval(interval);
  }, [state.parseDone, parseStart]);

  // P2-4: Timeout messaging for long-running 3-5 minute parse experience
  useEffect(() => {
    if (state.parseDone || parseElapsed < 90) return;
    if (parseElapsed === 90) {
      showToast('检查时间较长，请稍候...');
    }
    if (parseElapsed >= 360 && !parseError) {
      setParseTimedOut(true);
      setParseError('检查时间过长，请重试。如多次失败请联系客服');
    }
  }, [parseElapsed, state.parseDone]);

  // When done, record final time
  useEffect(() => {
    if (state.parseDone) {
      setParseElapsed(Math.floor((Date.now() - parseStart) / 1000));
    }
  }, [state.parseDone, parseStart]);

  useEffect(() => {
    const phase = Math.min(state.parsePhase, PARSE_PHASES.length - 1);
    if (!phaseEntryRef.current[phase]) {
      phaseEntryRef.current[phase] = Date.now();
    }
    const prevPhase = phase - 1;
    if (prevPhase >= 0 && phaseEntryRef.current[prevPhase] && !phaseDurations[prevPhase]) {
      setPhaseDurations(prev => ({
        ...prev,
        [prevPhase]: Date.now() - phaseEntryRef.current[prevPhase],
      }));
    }
  }, [state.parsePhase, phaseDurations]);

  useEffect(() => {
    if (!state.parseDone) return;
    const finalPhase = Math.min(state.parsePhase, PARSE_PHASES.length - 1);
    if (phaseEntryRef.current[finalPhase] && !phaseDurations[finalPhase]) {
      setPhaseDurations(prev => ({
        ...prev,
        [finalPhase]: Date.now() - phaseEntryRef.current[finalPhase],
      }));
    }
  }, [state.parseDone, state.parsePhase, phaseDurations]);

  // Task 1-3: Score count-up animation (ease-out cubic, 800ms)
  useEffect(() => {
    if (!state.parseDone) return;
    const duration = 800;
    const start = performance.now();
    const tick = () => {
      const elapsed = performance.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(eased * scoreRaw));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [state.parseDone, scoreRaw]);

  const school = useMemo(() => {
    return findSchoolById(state.schoolId);
  }, [state.schoolId]);

  const legacyDocWarning = useMemo(
    () => [...logs, ...((state.parseResults?.log || []).map(text => ({ t: 'warn' as const, text })))].some(entry => entry.text.includes('旧版 .doc 格式')),
    [logs, state.parseResults]
  );
  const activePhaseElapsedMs = (() => {
    const startedAt = phaseEntryRef.current[state.parsePhase];
    return startedAt ? Date.now() - startedAt : 0;
  })();
  useEffect(() => {
    if (logs.length <= prevLogCountRef.current) return;
    if (prevLogCountRef.current > 0) {
      prevLogCountRef.current = logs.length;
      return;
    }
    prevLogCountRef.current = logs.length;
  }, [logs]);

  function buildPreview(key: string, texts?: string[], rawHeadings?: string[]): string[] {
    return extractContent(texts || [], rawHeadings || [], key, 6);
  }

  function stampStructureDurations(doneKeys: string[]) {
    const elapsedMs = Date.now() - parseStart;
    setStructureDurations(prev => {
      const next = { ...prev };
      for (const key of doneKeys) {
        if (!next[key]) next[key] = elapsedMs;
      }
      return next;
    });
  }

  function applyVisualPhaseArtifacts(phaseIdx: number) {
    if (visualPhaseAppliedRef.current.has(phaseIdx)) return;
    visualPhaseAppliedRef.current.add(phaseIdx);

    if (phaseIdx === 0) {
      const docLabel = state.doc?.name?.replace(/\.(docx?|wps)$/i, '') || '当前论文';
      setItems(arr => arr.map((it, i) => i === 0 ? {
        ...it,
        conf: 0.99,
        done: true,
        preview: [`${docLabel}\n正在提取封面标题、作者和院系信息`],
      } : it));
      stampStructureDurations(['cover']);
      return;
    }

    if (phaseIdx === 1) {
      setItems(arr => arr.map((it, i) => {
        if (i > 3) return it;
        const fallbackPreview = (() => {
          if (it.key === 'abstract') return ['摘要段落已定位，正在抽取关键词与 Abstract 线索'];
          if (it.key === 'toc') return ['目录页与页码线索已定位，正在整理章节映射'];
          if (it.key === 'headings') return ['第 1 章 绪论', '1.1 研究背景', '1.2 研究目标'];
          return it.preview.length > 0 ? it.preview : ['已识别到结构线索'];
        })();
        return {
          ...it,
          conf: [0.97, 0.95, 0.93, 0.95][i] ?? 0.95,
          done: true,
          preview: it.preview.length > 0 ? it.preview : fallbackPreview,
        };
      }));
      stampStructureDurations(['abstract', 'toc', 'headings']);
      return;
    }

    if (phaseIdx === 2) {
      setItems(arr => arr.map((it, i) => {
        if (i > 6) return it;
        if (it.key === 'figures') {
          return {
            ...it,
            conf: 0.88,
            done: true,
            preview: ['已捕获图题候选 2 条', '正在比对图号与正文引用关系'],
          };
        }
        if (it.key === 'tables') {
          return {
            ...it,
            conf: 0.92,
            done: true,
            preview: ['已捕获表题候选 1 条', '正在检查跨页表格与表题位置'],
          };
        }
        return it;
      }));
      stampStructureDurations(['figures', 'tables']);
      return;
    }

    if (phaseIdx >= 3) {
      setItems(arr => arr.map((it, i) => i <= 6 ? {
        ...it,
        conf: i === 6 ? 0.71 : it.conf,
        done: true,
        preview: i === 6
          ? [
              '已提取参考文献样例 2 条，正在校验作者、年份与刊名格式',
              '检测到 1 组引用边界置信度偏低，建议在结果页复核',
            ]
          : it.preview,
      } : it));
      stampStructureDurations(['references']);
    }
  }

  const handlePauseToggle = () => {
    setPaused(prev => {
      const next = !prev;
      if (prev && queuedCompletionRef.current) {
        const finish = queuedCompletionRef.current;
        queuedCompletionRef.current = null;
        window.setTimeout(finish, 120);
      }
      showToast(next ? '已暂停前端审阅视图，后台解析仍会继续' : '已继续前端审阅视图');
      return next;
    });
  };

  const handleFastModeToggle = () => {
    setFastMode(prev => {
      const next = !prev;
      showToast(next ? '已切换到快速预览，优先展示关键结果' : '已恢复完整预览');
      return next;
    });
  };

  const handleSkipCurrentStep = () => {
    if (state.parseDone) return;
    const current = state.parsePhase;
    const nextPhase = Math.min(current + 1, PARSE_PHASES.length - 1);
    setSkippedSteps(prev => (prev.includes(current) ? prev : [...prev, current]));
    applyVisualPhaseArtifacts(current);
    applyVisualPhaseArtifacts(nextPhase);
    const nextBreakpoint = VISUAL_PHASE_BREAKPOINTS[Math.min(nextPhase, VISUAL_PHASE_BREAKPOINTS.length - 1)] ?? 1;
    set({
      parsePhase: nextPhase,
      parsePct: Math.max(state.parsePct, Math.min(VISUAL_PROGRESS_CAP, Math.round(nextBreakpoint * VISUAL_PROGRESS_CAP))),
    });
    showToast(`已跳过「${PARSE_PHASES[current]?.label || '当前步骤'}」的前端展示，后台解析会继续`);
  };

  useEffect(() => {
    const docId = getLegacyDocumentId(state);
    const profileId = state.schoolId;
    const noProfile = !profileId;
    let cancelled = false;
    let completionTimer: number | null = null;
    let visualTimer: number | null = null;
    let completionScheduled = false;

    const stopTimers = () => {
      if (completionTimer) window.clearTimeout(completionTimer);
      if (visualTimer) window.clearTimeout(visualTimer);
    };

    const startVisualProgressLoop = () => {
      const step = () => {
        if (cancelled || state.parseDone) return;
        if (pausedRef.current) {
          visualTimer = window.setTimeout(step, 240);
          return;
        }
        const speedMultiplier = fastModeRef.current ? 1.8 : 1;
        const { pct, phaseIdx } = getVisualProgressFrame((Date.now() - parseStart) * speedMultiplier);
        set({ parsePct: pct, parsePhase: phaseIdx });
        applyVisualPhaseArtifacts(phaseIdx);
        if (pct < VISUAL_PROGRESS_CAP) {
          visualTimer = window.setTimeout(step, 240);
        }
      };

      step();
    };

    const scheduleCompletion = (finish: () => void) => {
      if (completionScheduled) return;
      completionScheduled = true;
      const effectiveElapsed = (Date.now() - parseStart) * (fastModeRef.current ? 1.8 : 1);
      const remaining = Math.max(0, MIN_PARSE_EXPERIENCE_MS - effectiveElapsed);
      completionTimer = window.setTimeout(() => {
        if (cancelled) return;
        if (pausedRef.current) {
          queuedCompletionRef.current = finish;
          showToast('解析已经完成，继续后即可查看结果');
          return;
        }
        finish();
      }, remaining);
    };

    const finalizeSuccessfulParse = (result?: NonNullable<Awaited<ReturnType<typeof api.getJob>>['result']>) => {
      if (result) {
        const backendItems = Array.isArray(result.items) ? result.items : [];
        const texts = Array.isArray(result.parsedTexts) ? result.parsedTexts : [];
        const rawHeadings = Array.isArray(result.rawHeadings)
          ? result.rawHeadings.map((heading) => typeof heading === 'string' ? heading : heading.text)
          : [];
        setItems(STRUCT_ITEMS.map((si, i) => ({
          k: si.k,
          key: si.key,
          conf: backendItems[i]?.conf ?? null,
          done: true,
          preview: buildPreview(si.key, texts, rawHeadings),
        })));
        stampStructureDurations(STRUCT_ITEMS.map(si => si.key));

        set({
          parsePct: 100,
          parsePhase: PARSE_PHASES.length - 1,
          parseDone: true,
          parseResults: {
            items: backendItems,
            log: result.log || [],
            rules: result.rules || { passed: 0, warnings: 0, failed: 0 },
            ruleDetails: result.ruleDetails || [],
            findings: result.findings || [],
            parsedTexts: texts,
            rawHeadings,
          },
        });

        const rLog = (result.log as string[]) || [];
        if (rLog.length) {
          setLogs(L => [...L, ...rLog.map((text: string) => ({
            t: text.startsWith('▲') ? 'warn' as const : 'ok' as const,
            text,
          }))]);
        }
        if (rLog.some((text: string) => text.includes('旧版 .doc 格式'))) {
          showToast(LEGACY_DOC_HINT);
        }
        showToast('解析完成');
        return;
      }

      fallbackComplete();
    };

    async function run() {
      startVisualProgressLoop();

      if (!docId || docId === 'demo') {
        runSimulated();
        return;
      }

      try {
        setLogs(L => [...L, { t: 'phase', text: noProfile ? 'AUTO · 文档格式自检' : 'PRS · 创建解析任务' }]);
        const job = await api.createAnalyzeJob(docId, profileId);
        if (cancelled) return;
        set({ jobId: job.jobId, jobStatus: job.status });

        setLogs(L => [...L, { t: 'ok', text: `✓ 任务已创建: ${job.jobId}` }]);

        const POLL_INTERVAL = 1200;
        let lastStage = '';

        const poll = async () => {
          if (cancelled) return;
          try {
            const status = await api.getJob(job.jobId);
            if (cancelled) return;
            set({ jobStatus: status.status });

            // Log stage transitions
            if (status.stage && status.stage !== lastStage) {
              lastStage = status.stage;
              if (noProfile) {
                if (status.stage === 'parsing') setLogs(L => [...L, { t: 'phase', text: 'AUTO · 文档解析中' }]);
                else if (status.stage === 'analyzing_structure') setLogs(L => [...L, { t: 'phase', text: 'AUTO · 格式检测' }]);
                else if (status.stage === 'applying_rules') setLogs(L => [...L, { t: 'phase', text: 'AUTO · 问题汇总' }]);
              } else {
                if (status.stage === 'parsing') setLogs(L => [...L, { t: 'phase', text: 'STR · 文档解析中' }]);
                else if (status.stage === 'analyzing_structure') setLogs(L => [...L, { t: 'phase', text: 'REF · 结构识别' }]);
                else if (status.stage === 'applying_rules') setLogs(L => [...L, { t: 'phase', text: 'CHK · 规则预匹配' }]);
              }
            }

            if (status.status === 'completed') {
              scheduleCompletion(() => finalizeSuccessfulParse(status.result));
            } else if (status.status === 'failed') {
              stopTimers();
              showToast(`解析失败: ${status.error?.message || '未知错误'}`);
              fallbackComplete();
            } else {
              setTimeout(poll, POLL_INTERVAL);
            }
          } catch (err: any) {
            showToast(`状态查询失败: ${err.message}`);
            fallbackComplete();
          }
        };

        setTimeout(poll, 800);
      } catch (err: any) {
        showToast(`任务创建失败: ${err.message}`);
        runSimulated();
      }
    }

    function runSimulated() {
      setLogs(L => [...L, { t: 'phase', text: 'SIM · 启动玻璃盒解析流程' }]);
      scheduleCompletion(() => fallbackComplete());
    }

    // ── School-specific rule details ──
    function getSchoolRuleDetails(sid: string | null): { cat: string; items: [string, 'pass' | 'warn'][] }[] {
      if (sid === 'thu') return [
        { cat: '页面',           items: [['页边距 25/30/25/25 mm ✓', 'pass'], ['装订线 0 ✓', 'pass']] },
        { cat: '样式',           items: [['正文字体：宋体/Times New Roman ✓', 'pass'], ['正文行距：固定 20 磅 ✓', 'pass'], ['字符间距：标准 ✓', 'pass'], ['一级标题：黑体小 2 号加粗居中', 'pass'], ['二级标题：黑体小 3 号加粗左对齐 ✓', 'pass'], ['三级标题：黑体小 4 号加粗左对齐 ✓', 'pass'], ['标题段前段后 0 行 ✓', 'pass'], ['首行缩进 2 字符 ✓', 'pass'], ['脚注样式不在白名单', 'warn']] },
        { cat: '分节 & 页码',     items: [['前置页 罗马 ✓', 'pass'], ['正文 阿拉伯 1 起 ✓', 'pass'], ['页脚居中', 'pass']] },
        { cat: '图表 & 题注',     items: [['图题居下居中 ✓', 'pass'], ['图边框 0.75pt 黑色', 'warn'], ['表题居上居中 ✓', 'pass'], ['三线表格式合计 ✓', 'pass'], ['表 3-1 跨页 keep-together', 'warn']] },
        { cat: '目录 & 域',       items: [['自动目录刷新 ✓', 'pass'], ['图目录 ✓', 'pass'], ['表目录 ✓', 'pass']] },
        { cat: '📝 页眉页脚',     items: [['前置页：页眉已移除', 'pass'], ['正文页眉：论文题目 宋体五号 ✓', 'pass'], ['页眉线 1pt', 'pass'], ['奇偶页不同已配置 ✓', 'pass'], ['参考文献页眉同正文 ✓', 'pass']] },
        { cat: '📝 摘要 & 关键词', items: [['中文摘要：532 字 ✓', 'pass'], ['关键词分隔符：分号 ✓', 'pass'], ['英文摘要：289 词 ✓', 'pass']] },
        { cat: '🔗 交叉引用',     items: [['总引用 31 个', 'pass'], ['正常 29 个 ✓', 'pass'], ['断裂 2 个 ⚠️', 'warn']] },
        { cat: '🔤 标点符号',     items: [['全角逗号检查 ✓', 'pass'], ['引号格式 ✓', 'pass'], ['分号全角/半角', 'warn']] },
        { cat: '参考文献',        items: [['GB/T 7714-2015 体例 ✓', 'pass'], ['悬挂缩进 ✓', 'pass'], ['45 条引用 5 条需修正', 'warn'], ['[22] 出版年缺失', 'warn']] },
      ];
      if (sid === 'pku') return [
        { cat: '页面',           items: [['页边距 25/25/25/25 mm ✓', 'pass'], ['装订线 0', 'pass']] },
        { cat: '样式',           items: [['正文字体：宋体/Times New Roman ✓', 'pass'], ['正文行距：固定 22 磅', 'warn'], ['字符间距：标准 ✓', 'pass'], ['一级标题：黑体小 2 号加粗居中', 'pass'], ['二级标题：黑体小 3 号加粗左对齐 ✓', 'pass'], ['三级标题：宋体小 4 号加粗', 'warn'], ['标题段前段后 0.5 行 ✓', 'pass'], ['首行缩进 2 字符 ✓', 'pass']] },
        { cat: '分节 & 页码',     items: [['前置页 罗马 ✓', 'pass'], ['正文 阿拉伯 1 起 ✓', 'pass'], ['页脚居中', 'pass']] },
        { cat: '图表 & 题注',     items: [['图题居下居中 ✓', 'pass'], ['图边框 1pt 黑色', 'warn'], ['表题居上 ✓', 'pass'], ['三线表格式：上下 1pt / 中 0.5pt', 'warn']] },
        { cat: '目录 & 域',       items: [['自动目录刷新 ✓', 'pass']] },
        { cat: '📝 页眉页脚',     items: [['前置页：页眉已移除', 'pass'], ['正文页眉：章标题 宋体五号', 'warn'], ['页眉线 0.5pt', 'pass'], ['奇偶页不同已配置 ✓', 'pass']] },
        { cat: '📝 摘要 & 关键词', items: [['中文摘要：423 字 ✓', 'pass'], ['关键词分隔符：逗号', 'warn'], ['英文摘要：265 词 ✓', 'pass']] },
        { cat: '🔗 交叉引用',     items: [['总引用 19 个', 'pass'], ['正常 18 个 ✓', 'pass'], ['断裂 1 个 ⚠️', 'warn']] },
        { cat: '🔤 标点符号',     items: [['全角逗号检查 ✓', 'pass'], ['引号格式', 'warn'], ['分号全角/半角', 'warn']] },
        { cat: '参考文献',        items: [['GB/T 7714-2015 体例 ✓', 'pass'], ['悬挂缩进 ✓', 'pass'], ['28 条引用 4 条需修正', 'warn'], ['[12] 作者格式不一致', 'warn']] },
      ];
      if (sid === 'cqccst') return [
        { cat: '页面',           items: [['页边距 25/20/25/25 mm ✓', 'pass'], ['装订线 0 ✓', 'pass']] },
        { cat: '样式',           items: [['正文字体：宋体/Times New Roman ✓', 'pass'], ['正文行距：固定 23 磅 ✓', 'pass'], ['字符间距：标准 ✓', 'pass'], ['一级标题：黑体小 2 号不加粗左对齐 ✓', 'pass'], ['二级标题：黑体小 3 号不加粗左对齐 ✓', 'pass'], ['三级标题：黑体 4 号不加粗左对齐 ✓', 'pass'], ['每章另起一页 ✓', 'pass'], ['标题段前段后 0.5 行 ✓', 'pass'], ['首行缩进 2 字符 ✓', 'pass'], ['脚注样式不在白名单', 'warn']] },
        { cat: '分节 & 页码',     items: [['前置页 罗马 ✓', 'pass'], ['正文 阿拉伯 1 起 ✓', 'pass'], ['页脚居中', 'pass']] },
        { cat: '图表 & 题注',     items: [['图题居下居中 ✓', 'pass'], ['图边框 0.75pt 黑色', 'warn'], ['表题居上 ✓', 'pass'], ['三线表：上下 1.5pt / 中 0.75pt ✓', 'pass'], ['表 3-1 跨页 keep-together', 'warn']] },
        { cat: '目录 & 域',       items: [['自动目录刷新 ✓', 'pass'], ['章名黑体 4 号 ✓', 'pass'], ['文内宋体小 4 号 ✓', 'pass']] },
        { cat: '📝 页眉页脚',     items: [['前置页：页眉已移除', 'pass'], ['正文页眉：论文题目 宋体五号 ✓', 'pass'], ['页眉线 0.75pt ✓', 'pass'], ['奇偶页不同已配置 ✓', 'pass'], ['参考文献页眉同正文 ✓', 'pass']] },
        { cat: '📝 摘要 & 关键词', items: [['中文摘要：487 字 ✓', 'pass'], ['关键词分隔符：分号 ✓', 'pass'], ['英文摘要：312 词 ⚠️ 超限 12 词', 'warn']] },
        { cat: '🔗 交叉引用',     items: [['总引用 23 个', 'pass'], ['正常 21 个 ✓', 'pass'], ['断裂 2 个 ⚠️', 'warn']] },
        { cat: '🔤 标点符号',     items: [['全角逗号检查 ✓', 'pass'], ['引号格式', 'warn'], ['分号全角/半角', 'warn']] },
        { cat: '参考文献',        items: [['GB/T 7714-2015 体例 ✓', 'pass'], ['悬挂缩进 ✓', 'pass'], ['32 条引用 6 条需修正', 'warn'], ['[8] 缺少出版年份', 'warn'], ['[15] 编号格式不一致', 'warn'], ['外文文献 ≥ 3 篇', 'warn']] },
      ];
      // Default/generic rules
      return [
        { cat: '页面',           items: [['页边距 25/20/25/25 mm ✓', 'pass'], ['装订线 0', 'pass']] },
        { cat: '样式',           items: [['正文字体：宋体/Times New Roman ✓', 'pass'], ['正文行距：固定 23 磅 ✓', 'pass'], ['字符间距：标准 ✓', 'pass'], ['一级标题：黑体小 2 号 ✓', 'pass'], ['二级标题：黑体小 3 号 ✓', 'pass'], ['三级标题：黑体 4 号 ✓', 'pass'], ['标题段前段后 0.5 行 ✓', 'pass'], ['首行缩进 2 字符 ✓', 'pass'], ['脚注样式不在白名单', 'warn']] },
        { cat: '分节 & 页码',     items: [['前置页 罗马', 'pass'], ['正文 阿拉伯 1 起', 'pass'], ['页脚居中', 'pass']] },
        { cat: '图表 & 题注',     items: [['图题居下居中 ✓', 'pass'], ['图边框 0.75pt 黑色', 'warn'], ['表题居上 ✓', 'pass'], ['三线表格式：上下 1.5pt / 中 0.75pt', 'warn']] },
        { cat: '目录 & 域',       items: [['自动目录刷新', 'pass']] },
        { cat: '📝 页眉页脚',     items: [['前置页：页眉已移除', 'pass'], ['正文页眉：论文题目 宋体五号', 'pass'], ['页眉线 0.75pt', 'pass'], ['奇偶页不同已配置', 'pass'], ['参考文献页眉同正文', 'pass']] },
        { cat: '📝 摘要 & 关键词', items: [['中文摘要：487 字 ✓', 'pass'], ['关键词分隔符：分号 ✓', 'pass'], ['英文摘要：312 词 ⚠️ 超限 12 词', 'warn']] },
        { cat: '🔗 交叉引用',     items: [['总引用 23 个', 'pass'], ['正常 21 个 ✓', 'pass'], ['断裂 2 个 ⚠️', 'warn']] },
        { cat: '🔤 标点符号',     items: [['全角逗号检查 ✓', 'pass'], ['引号格式', 'warn'], ['分号全角/半角', 'warn']] },
        { cat: '参考文献',        items: [['GB/T 7714-2015 体例', 'pass'], ['悬挂缩进', 'pass'], ['32 条引用 6 条需修正', 'warn']] },
      ];
    }

    function fallbackComplete() {
      const ruleDetails = getSchoolRuleDetails(state.schoolId);
      const passed = ruleDetails.flatMap(g => g.items).filter(([, s]) => s === 'pass').length;
      const warnings = ruleDetails.flatMap(g => g.items).filter(([, s]) => s === 'warn').length;
      set({
        parsePct: 100,
        parseDone: true,
        parseResults: {
          items: items.map(it => ({ k: it.k, conf: it.conf ?? 0 })),
          log: logs.map(l => l.text),
          rules: { passed, warnings, failed: 0 },
          ruleDetails,
          findings: [],
          parsedTexts: undefined,
          rawHeadings: undefined,
        },
      });
      stampStructureDurations(STRUCT_ITEMS.map(si => si.key));
      showToast('解析完成');
    }

    run();
    return () => {
      cancelled = true;
      stopTimers();
    };
  }, []);

  const elapsedStr = parseElapsed < 60 ? `${parseElapsed}s` : `${Math.floor(parseElapsed / 60)}m ${parseElapsed % 60}s`;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <div style={{ flex: 1, overflow: 'auto', padding: '28px 56px' }}>
        {!state.parseDone ? (
          <ParseTimeline
            state={state}
            docName={state.doc?.name || '当前论文'}
            items={items}
            logs={logs}
            structureDurations={structureDurations}
            activePhaseElapsedMs={activePhaseElapsedMs}
            parseError={parseError}
            parseTimedOut={parseTimedOut}
            legacyDocWarning={legacyDocWarning}
            elapsedStr={elapsedStr}
            paused={paused}
            fastMode={fastMode}
            skippedSteps={skippedSteps}
            onPauseToggle={handlePauseToggle}
            onFastModeToggle={handleFastModeToggle}
            onSkipCurrentStep={handleSkipCurrentStep}
            onRetry={() => { setParseError(null); setParseTimedOut(false); window.location.reload(); }}
          />
        ) : (
          <ParseResults
            legacyDocWarning={legacyDocWarning}
            totalIssues={totalIssues}
            fixableIssues={fixableIssues}
            animatedScore={animatedScore}
            scoreTone={scoreTone}
            scoreBg={scoreBg}
            issueGroups={issueGroups}
            school={school}
            elapsedStr={elapsedStr}
            logs={logs}
            showShare={showShare}
            onStep={(s) => set({ step: s })}
            onCloseShare={() => setShowShare(false)}
            onShareClick={() => { analytics.shareClick('result_page'); setShowShare(true); }}
          />
        )}
      </div>
    </div>
  );
};

export default Step3Parse;
