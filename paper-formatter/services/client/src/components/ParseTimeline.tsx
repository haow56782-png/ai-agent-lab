import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Btn, SpinDot } from './Common';
import type { AppState } from './AppFrame';
import type { StructItemEx as StructPanelItem } from './StructPanel';

const STEP_ARTIFACT_KEYS: string[][] = [
  ['cover'],
  ['cover', 'abstract', 'toc', 'headings'],
  ['figures', 'tables', 'references'],
  ['references'],
];

interface TimelineStep {
  title: string;
  detail: string;
}

interface StepArtifactRow {
  key: string;
  label: string;
  status: 'done' | 'running' | 'pending' | 'warning' | 'skipped';
  detail: string;
  meta?: string | null;
}

interface ParsedLogStats {
  paragraphCount: number | null;
  tableCount: number | null;
  sectionCount: number | null;
  pageSetup: string | null;
}

const TIMELINE_STEPS: TimelineStep[] = [
  { title: '读取论文原稿', detail: '接入 DOCX 样式、分页与正文骨架' },
  { title: '识别论文结构', detail: '定位封面、摘要、目录与标题层级' },
  { title: '校验题注与文献', detail: '核对图表题注、参考文献与引用段落' },
  { title: '生成修复方案', detail: '整理出可以直接落到稿件里的排版动作' },
];

function formatDurationLabel(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function trimLine(text: string, limit = 72): string {
  const clean = text.replace(/[\x00-\x08\x0e-\x1f]/g, '').replace(/\s+/g, ' ').trim();
  if (clean.length <= limit) return clean;
  return `${clean.slice(0, limit - 1)}…`;
}

function summarizeMeta(item: StructPanelItem): string | null {
  if (item.conf === null) return null;
  const conf = `置信度 ${Math.round(item.conf * 100)}%`;
  if (item.preview.length === 0 || item.preview[0] === '（未识别到内容）') return conf;
  return `${conf} · 样例 ${item.preview.length} 条`;
}

function statusText(status: StepArtifactRow['status']): string {
  switch (status) {
    case 'done':
      return '识别成功';
    case 'running':
      return '进行中';
    case 'pending':
      return '等待';
    case 'warning':
      return '需你确认';
    case 'skipped':
      return '已跳过';
  }
}

function statusColor(status: StepArtifactRow['status']): string {
  switch (status) {
    case 'done':
      return 'var(--leaf-700)';
    case 'running':
      return 'var(--brand-700)';
    case 'pending':
      return 'var(--ink-400)';
    case 'warning':
      return 'var(--sun-700)';
    case 'skipped':
      return 'var(--ink-500)';
  }
}

function parseLogStats(logs: { text: string }[]): ParsedLogStats {
  let paragraphCount: number | null = null;
  let tableCount: number | null = null;
  let sectionCount: number | null = null;
  let pageSetup: string | null = null;

  for (const entry of logs) {
    const structureMatch = entry.text.match(/段落:\s*(\d+)\s*·\s*表格:\s*(\d+)\s*·\s*节:\s*(\d+)/);
    if (structureMatch) {
      paragraphCount = Number(structureMatch[1]);
      tableCount = Number(structureMatch[2]);
      sectionCount = Number(structureMatch[3]);
    }
    const pageMatch = entry.text.match(/页面设置:\s*(.+)$/);
    if (pageMatch) {
      pageSetup = pageMatch[1].trim();
    }
  }

  return { paragraphCount, tableCount, sectionCount, pageSetup };
}

function firstMeaningfulPreview(item?: StructPanelItem): string | null {
  if (!item || item.preview.length === 0) return null;
  const candidate = item.preview.find((line) => line !== '（未识别到内容）');
  return candidate ? trimLine(candidate) : null;
}

function previewCount(item?: StructPanelItem): number {
  if (!item) return 0;
  return item.preview.filter((line) => line !== '（未识别到内容）').length;
}

interface ParseTimelineProps {
  state: AppState;
  docName: string;
  items: StructPanelItem[];
  logs: { t: 'phase' | 'ok' | 'warn'; text: string }[];
  structureDurations: Record<string, number>;
  activePhaseElapsedMs: number;
  parseError: string | null;
  parseTimedOut: boolean;
  legacyDocWarning: boolean;
  elapsedStr: string;
  paused: boolean;
  fastMode: boolean;
  skippedSteps: number[];
  onPauseToggle: () => void;
  onFastModeToggle: () => void;
  onSkipCurrentStep: () => void;
  onRetry: () => void;
}

export const ParseTimeline: React.FC<ParseTimelineProps> = ({
  state,
  docName,
  items,
  logs,
  structureDurations,
  activePhaseElapsedMs,
  parseError,
  parseTimedOut,
  legacyDocWarning,
  elapsedStr,
  paused,
  fastMode,
  skippedSteps,
  onPauseToggle,
  onFastModeToggle,
  onSkipCurrentStep,
  onRetry,
}) => {
  const [showLog, setShowLog] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<number[]>([]);
  const [acceptedSteps, setAcceptedSteps] = useState<number[]>([]);
  const [flaggedSteps, setFlaggedSteps] = useState<number[]>([]);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const currentPhaseIdx = Math.min(state.parsePhase, TIMELINE_STEPS.length - 1);

  useEffect(() => {
    setExpandedSteps((prev) => (prev.includes(currentPhaseIdx) ? prev : [...prev, currentPhaseIdx]));
  }, [currentPhaseIdx]);

  useEffect(() => {
    const idx = Math.min(currentPhaseIdx, TIMELINE_STEPS.length - 1);
    stepRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [currentPhaseIdx, state.parsePct]);

  const itemMap = useMemo(() => new Map(items.map((item) => [item.key, item])), [items]);
  const latestLog = logs[logs.length - 1]?.text || '正在推进当前步骤';
  const lowConfItems = items.filter((item) => item.conf !== null && item.conf < 0.85);
  const logStats = useMemo(() => parseLogStats(logs), [logs]);

  const buildStepArtifacts = (stepIdx: number): StepArtifactRow[] => {
    const stepDone = stepIdx < currentPhaseIdx || state.parseDone;
    const stepRunning = stepIdx === currentPhaseIdx && !state.parseDone;
    const stepSkipped = skippedSteps.includes(stepIdx);

    if (stepIdx === 0) {
      return [
        {
          key: 'ingest-doc',
          label: '原稿接入',
          status: stepSkipped ? 'skipped' : stepDone ? 'done' : stepRunning ? 'running' : 'pending',
          detail: stepDone
            ? `已载入《${docName}》的正文骨架与分页线索`
            : '正在读取文档样式、分页和正文骨架',
          meta: docName,
        },
        {
          key: 'ingest-scale',
          label: '文档规模',
          status: stepSkipped
            ? 'skipped'
            : logStats.paragraphCount !== null
            ? 'done'
            : stepRunning
            ? 'running'
            : 'pending',
          detail: logStats.paragraphCount !== null
            ? `正文段落 ${logStats.paragraphCount} 段 · 表格 ${logStats.tableCount ?? 0} 个 · 分节 ${logStats.sectionCount ?? 0} 个`
            : '等待 Python 解析器返回段落、表格和分节统计',
          meta: logStats.pageSetup ? `页面设置 ${logStats.pageSetup}` : '结构统计会随解析结果同步更新',
        },
      ];
    }

    if (stepIdx === 3) {
      const rows: StepArtifactRow[] = [
        {
          key: 'rule-plan',
          label: '规则预匹配',
          status: stepSkipped
            ? 'skipped'
            : parseError
            ? 'warning'
            : stepRunning
            ? 'running'
            : stepDone
            ? 'done'
            : 'pending',
          detail: parseError
            ? parseError
            : stepRunning
            ? latestLog
            : '将汇总问题清单、可修复动作和后续人工确认项',
          meta: lowConfItems.length > 0 ? `${lowConfItems.length} 项低置信度结果会进入后续人工确认` : '解析完成后会直接进入报告页',
        },
      ];

      if (lowConfItems.length > 0) {
        rows.push({
          key: 'manual-review',
          label: '待人工确认',
          status: 'warning',
          detail: `当前有 ${lowConfItems.length} 组识别结果置信度偏低，建议在结果页重点核对目录、标题或参考文献。`,
          meta: lowConfItems.map((item) => item.k).join(' / '),
        });
      }

      if (parseTimedOut) {
        rows.push({
          key: 'timeout',
          label: '长耗时提醒',
          status: 'warning',
          detail: '当前任务已超过预期时长。你可以重试，或先使用快速预览模式查看已生成的结构结果。',
          meta: '当前版本尚不支持真正暂停服务器任务',
        });
      }

      return rows;
    }

    return (STEP_ARTIFACT_KEYS[stepIdx] || [])
      .map((key) => itemMap.get(key))
      .filter(Boolean)
      .map((item) => {
        const target = item as StructPanelItem;
        const isCurrentArtifact = stepRunning && !target.done;
        const sampleCount = previewCount(target);
        let detail = '正在生成中间结果';

        if (target.key === 'cover') {
          detail = firstMeaningfulPreview(target) || '正在提取封面标题、院系与作者信息';
        } else if (target.key === 'abstract') {
          detail = sampleCount > 0
            ? `已定位摘要相关段落 ${sampleCount} 条，首条为「${firstMeaningfulPreview(target) || '摘要线索'}」`
            : '正在定位摘要、关键词与 Abstract 段落';
        } else if (target.key === 'toc') {
          detail = sampleCount > 0
            ? `已识别目录与页码线索 ${sampleCount} 条`
            : '正在识别目录页和目录页码线索';
        } else if (target.key === 'headings') {
          detail = sampleCount > 0
            ? `已识别标题线索 ${sampleCount} 条，首条为「${firstMeaningfulPreview(target) || '标题线索'}」`
            : '正在分析一级、二级和三级标题层级';
        } else if (target.key === 'figures') {
          detail = sampleCount > 0
            ? `已捕获图题候选 ${sampleCount} 条，样例「${firstMeaningfulPreview(target) || '图题线索'}」`
            : '正在检索图题、图号和图注位置';
        } else if (target.key === 'tables') {
          detail = sampleCount > 0
            ? `已捕获表题候选 ${sampleCount} 条，样例「${firstMeaningfulPreview(target) || '表题线索'}」`
            : '正在检索表题、表号和跨页表格信息';
        } else if (target.key === 'references') {
          detail = sampleCount > 0
            ? `已识别参考文献样例 ${sampleCount} 条，首条为「${firstMeaningfulPreview(target) || '参考文献线索'}」`
            : '正在定位参考文献区域与条目边界';
        }

        const status: StepArtifactRow['status'] = stepSkipped
          ? 'skipped'
          : target.done
          ? target.conf !== null && target.conf < 0.85
            ? 'warning'
            : 'done'
          : isCurrentArtifact
          ? 'running'
          : 'pending';

        return {
          key: target.key,
          label: target.k,
          status,
          detail,
          meta: summarizeMeta(target),
        };
      });
  };

  const toggleExpandedStep = (idx: number) => {
    if (idx === currentPhaseIdx && !state.parseDone) return;
    setExpandedSteps((prev) => (prev.includes(idx) ? prev.filter((step) => step !== idx) : [...prev, idx]));
  };

  const handleFlagStep = (idx: number) => {
    setExpandedSteps((prev) => (prev.includes(idx) ? prev : [...prev, idx]));
    setFlaggedSteps((prev) => (prev.includes(idx) ? prev : [...prev, idx]));
    setAcceptedSteps((prev) => prev.filter((step) => step !== idx));
  };

  const handleAcceptStep = (idx: number) => {
    setAcceptedSteps((prev) => (prev.includes(idx) ? prev : [...prev, idx]));
    setFlaggedSteps((prev) => prev.filter((step) => step !== idx));
  };

  return (
    <div>
      <div className="secdex" style={{ marginBottom: 10 }}>第三步 · PARSE</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 18, marginBottom: 12 }}>
        <div>
          <h2 className="serif" style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 600, color: 'var(--ink-900)', letterSpacing: -.4 }}>
            系统正在替你拆开这篇论文的结构
          </h2>
          <p style={{ fontSize: 13, color: 'var(--ink-500)', margin: 0, maxWidth: 680, lineHeight: 1.6 }}>
            这里只保留一条单一时间轴。每一步都会展示当前识别到的中间结果，你可以控制前端审阅节奏，但服务器端解析任务会继续运行。
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Btn kind={paused ? 'primary' : 'ghost'} size="sm" onClick={onPauseToggle}>
            {paused ? '继续审阅视图' : '暂停审阅视图'}
          </Btn>
          <Btn kind={fastMode ? 'brand' : 'ghost'} size="sm" onClick={onFastModeToggle}>
            {fastMode ? '快速预览中' : '切到快速预览'}
          </Btn>
        </div>
      </div>

      <div style={{
        marginBottom: 14,
        padding: '10px 12px',
        borderRadius: 6,
        background: 'var(--paper-1)',
        border: '1px solid var(--hair)',
        fontSize: 12.5,
        color: 'var(--ink-600)',
        lineHeight: 1.6,
      }}>
        <span style={{ fontWeight: 600, color: 'var(--ink-800)' }}>当前控制说明：</span>
        <span>暂停、快速预览和跳过当前展示只影响你眼前这段审阅节奏，不会暂停服务器里的 Python 解析任务。</span>
      </div>

      {parseError ? (
        <div style={{
          marginBottom: 14, padding: '12px 14px', borderRadius: 6,
          background: 'var(--rust-100)', border: '1px solid rgba(184,84,47,.18)',
          fontSize: 12.5, color: 'var(--rust-700)', lineHeight: 1.55,
        }}>
          <span style={{ fontWeight: 600 }}>异常提醒：</span>
          <span>{parseError}</span>
        </div>
      ) : parseTimedOut ? (
        <div style={{
          marginBottom: 14, padding: '12px 14px', borderRadius: 6,
          background: 'var(--sun-100)', border: '1px solid rgba(183,135,43,.18)',
          fontSize: 12.5, color: 'var(--sun-700)', lineHeight: 1.55,
        }}>
          <span style={{ fontWeight: 600 }}>耗时较长：</span>
          <span>后台解析还在继续。你可以先切到快速预览模式查看已识别出的结构结果。</span>
        </div>
      ) : null}

      {legacyDocWarning && (
        <div style={{
          marginBottom: 14, padding: '10px 12px', borderRadius: 4,
          background: 'var(--sun-100)', border: '1px solid rgba(183,135,43,.18)',
          fontSize: 12.5, color: 'var(--sun-700)', lineHeight: 1.55,
        }}>
          <span style={{ fontWeight: 600 }}>兼容格式提醒：</span>
          <span>检测到当前文件是旧版 .doc / WPS 兼容格式。解析可以继续，但自动修复前请先另存为 .docx。</span>
        </div>
      )}

      <div style={{
        background: 'var(--paper-0)', border: '1px solid var(--hair)', borderRadius: 6,
        overflow: 'hidden', marginBottom: 16,
      }}>
        <div style={{
          padding: '14px 18px', borderBottom: '1px solid var(--hair)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-900)' }}>
              单一任务时间轴
              <span className="mono" style={{ fontSize: 10, color: 'var(--ink-500)', fontWeight: 400, marginLeft: 8 }}>
                {currentPhaseIdx + 1}/{TIMELINE_STEPS.length} · {elapsedStr}
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-500)', marginTop: 4 }}>
              当前聚焦：{TIMELINE_STEPS[currentPhaseIdx]?.title || '解析中'} {paused ? '· 仅暂停前端审阅' : fastMode ? '· 快速预览' : ''}
            </div>
          </div>
          {!state.parseDone && (
            <Btn kind="ghost" size="sm" onClick={onSkipCurrentStep}>
              跳过当前展示
            </Btn>
          )}
        </div>

        {TIMELINE_STEPS.map((step, idx) => {
          const isDone = idx < currentPhaseIdx || state.parseDone;
          const isCurrent = idx === currentPhaseIdx && !state.parseDone;
          const isSkipped = skippedSteps.includes(idx);
          const isOpen = isCurrent || expandedSteps.includes(idx);
          const artifacts = buildStepArtifacts(idx);
          const hasWarnings = artifacts.some((artifact) => artifact.status === 'warning');
          const phaseDuration = (() => {
            const keys = STEP_ARTIFACT_KEYS[idx] || [];
            const ms = keys.reduce((max, key) => Math.max(max, structureDurations[key] || 0), 0);
            if (ms > 0) return formatDurationLabel(ms);
            if (isCurrent) return paused ? '已暂停审阅' : formatDurationLabel(activePhaseElapsedMs);
            return null;
          })();

          const leadingColor = isCurrent
            ? 'var(--brand-700)'
            : hasWarnings
            ? 'var(--sun-500)'
            : isDone
            ? 'var(--leaf-500)'
            : 'var(--paper-2)';

          return (
            <div
              key={step.title}
              ref={(el) => { stepRefs.current[idx] = el; }}
              style={{
                borderBottom: idx < TIMELINE_STEPS.length - 1 ? '1px solid var(--hair)' : 'none',
                background: isCurrent ? 'linear-gradient(90deg, rgba(220,229,238,.55), rgba(251,250,246,0))' : 'transparent',
                transition: 'background .35s ease',
              }}
            >
              <div
                onClick={() => toggleExpandedStep(idx)}
                style={{
                  padding: '14px 18px',
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  cursor: isCurrent ? 'default' : 'pointer',
                  borderLeft: `2.5px solid ${leadingColor}`,
                }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: 14,
                  background: isCurrent ? 'var(--brand-100)' : isDone ? 'var(--leaf-100)' : 'var(--paper-2)',
                  color: isCurrent ? 'var(--brand-700)' : isDone ? 'var(--leaf-700)' : isSkipped ? 'var(--ink-500)' : 'var(--ink-400)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontFamily: 'var(--mono)', fontWeight: 700,
                  flex: '0 0 auto',
                }}>
                  {isSkipped ? '→' : isDone ? '✓' : isCurrent ? <SpinDot /> : idx + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: 14, fontWeight: isCurrent ? 600 : 500,
                      color: isCurrent ? 'var(--ink-900)' : isDone ? 'var(--ink-700)' : 'var(--ink-600)',
                    }}>
                      {step.title}
                    </span>
                    {isCurrent && <span className="chip brand">当前步骤</span>}
                    {isSkipped && <span className="chip">已跳过</span>}
                    {acceptedSteps.includes(idx) && <span className="chip leaf">已标记接受</span>}
                    {flaggedSteps.includes(idx) && <span className="chip sun">待人工校对</span>}
                    {hasWarnings && !isCurrent && !flaggedSteps.includes(idx) && <span className="chip sun">需你确认</span>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 4, lineHeight: 1.55 }}>
                    {isCurrent ? latestLog : step.detail}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flex: '0 0 auto' }}>
                  <div className="mono" style={{ fontSize: 10.5, color: isCurrent ? 'var(--brand-700)' : 'var(--ink-400)' }}>
                    {isCurrent
                      ? paused
                        ? '已暂停审阅'
                        : '运行中'
                      : isSkipped
                      ? '已跳过'
                      : isDone
                      ? '已完成'
                      : '等待'}
                  </div>
                  {phaseDuration && (
                    <div className="mono" style={{ fontSize: 10, color: 'var(--ink-400)', marginTop: 4 }}>
                      {phaseDuration}
                    </div>
                  )}
                  {(isDone || isCurrent) && (
                    <div style={{ fontSize: 10, color: 'var(--ink-400)', marginTop: 4 }}>
                      {isOpen ? '收起产物 ▴' : '查看产物 ▾'}
                    </div>
                  )}
                </div>
              </div>

              {isOpen && (
                <div style={{ padding: '0 18px 16px 60px', animation: 'protoFadeUp .25s ease' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {artifacts.map((artifact) => (
                      <div key={artifact.key} style={{
                        border: `1px solid ${artifact.status === 'warning' ? 'rgba(183,135,43,.22)' : 'var(--hair)'}`,
                        background: artifact.status === 'warning' ? 'var(--sun-100)' : 'var(--paper-0)',
                        borderRadius: 6,
                        padding: '10px 12px',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink-900)' }}>{artifact.label}</div>
                          <span className="mono" style={{ fontSize: 10, color: statusColor(artifact.status) }}>
                            {statusText(artifact.status)}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--ink-600)', marginTop: 5, lineHeight: 1.55 }}>
                          {artifact.detail}
                        </div>
                        {artifact.meta && (
                          <div className="mono" style={{ fontSize: 10, color: 'var(--ink-400)', marginTop: 6 }}>
                            {artifact.meta}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                    {isCurrent && logs.length > 0 && (
                      <Btn kind="ghost" size="sm" onClick={() => setShowLog(!showLog)}>
                        {showLog ? '收起实时日志' : '查看实时日志'}
                      </Btn>
                    )}
                    {(isDone || isCurrent) && (
                      <>
                        <Btn kind="ghost" size="sm" onClick={() => handleFlagStep(idx)}>
                          标记为稍后人工校对
                        </Btn>
                        <Btn kind="ghost" size="sm" onClick={() => handleAcceptStep(idx)}>
                          先接受本组识别结果
                        </Btn>
                      </>
                    )}
                    {isCurrent && !state.parseDone && (
                      <Btn kind="quiet" size="sm" onClick={onSkipCurrentStep}>
                        跳过当前展示
                      </Btn>
                    )}
                  </div>

                  {isCurrent && showLog && logs.length > 0 && (
                    <div style={{
                      marginTop: 10,
                      padding: '10px 12px',
                      background: 'var(--paper-1)', borderRadius: 6,
                      fontSize: 11.5, fontFamily: 'var(--mono)', lineHeight: 1.6,
                      maxHeight: 180, overflow: 'auto',
                    }}>
                      {logs.map((log, index) => (
                        <div key={`${log.text}-${index}`} style={{
                          color: log.t === 'warn' ? 'var(--sun-700)' : log.t === 'phase' ? 'var(--ink-500)' : 'var(--ink-700)',
                        }}>
                          <span style={{ color: 'var(--ink-400)' }}>{'> '}</span>
                          {log.text}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ fontSize: 12, color: 'var(--ink-500)', lineHeight: 1.55 }}>
          真实中间产物会随着后台轮询结果更新。当前版本还没有接入类似 Manus 的服务端实时流，所以这里以可核对的结构结果为主，而不是装饰性数字。
        </div>
        {(parseError || parseTimedOut) && (
          <Btn kind="ghost" size="sm" onClick={onRetry}>
            重新发起解析
          </Btn>
        )}
      </div>
    </div>
  );
};
