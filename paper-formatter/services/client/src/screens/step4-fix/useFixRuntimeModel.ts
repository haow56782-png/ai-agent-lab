import { useMemo } from 'react';
import { getCanonicalDocumentId, type AppState, type SchoolOption } from '../../components/AppFrame';
import type { FixRuntimeStore, LiveDocumentFrame } from '../../components/fix-runtime/types';
import { getActionDuration } from '../../components/fix-runtime/utils';
import { createMockPaperContent } from '../../mock/paperContent';
import { FIX_STEPS } from './constants';
import { collectRuntimeFindings, createFixActionsFromFindings } from './findingFixActionAdapter';
import type { FixStep } from './types';
import { cleanDocLine, getPageChapterLabel } from './utils';

interface Params {
  state: AppState;
  school: SchoolOption | null;
  steps: FixStep[];
  fixMessage: string | null;
  fixing: boolean;
  demoPlayback: boolean;
  forceCompleted: boolean;
  viewPaused: boolean;
  fixElapsedMs: number;
  liveFrameIndex: number;
  speed: 1 | 2 | 4;
}

function isLegacyDoc(name?: string | null): boolean {
  return !!name && /\.doc$/i.test(name.trim());
}

function getDocumentTitle(state: AppState): string {
  return cleanDocLine(state.doc?.name?.replace(/\.(docx|doc|pdf)$/i, ''), '本科毕业论文');
}

function getRuntimeStatus(input: {
  allDone: boolean;
  active: boolean;
  viewPaused: boolean;
}): FixRuntimeStore['status'] {
  if (input.allDone) return 'completed';
  if (input.viewPaused) return 'paused';
  return input.active ? 'running' : 'paused';
}

export function useFixRuntimeModel({
  state,
  school,
  steps,
  fixMessage,
  fixing,
  demoPlayback,
  forceCompleted,
  viewPaused,
  fixElapsedMs,
  liveFrameIndex,
  speed,
}: Params) {
  const documentTitle = getDocumentTitle(state);
  const schoolRuleName = school?.name ? `${school.name} vAuto` : '学校规则 vAuto';
  const baselineRuleName = school?.baseStandardVersion || 'GB/T 7713.1-2025';
  const parsedTexts = state.parseResults?.parsedTexts ?? [];
  const headings = state.parseResults?.rawHeadings ?? [];
  const totalPages = Math.max(1, state.doc?.pages || 15);
  const canonicalDocumentId = getCanonicalDocumentId(state) || 'demo-document';

  const paperContent = useMemo(() => createMockPaperContent({
    title: documentTitle,
    header: school?.name ? `${school.name}本科毕业论文` : '本科毕业论文',
    totalPages,
    headings,
    paragraphs: parsedTexts,
  }), [documentTitle, headings, parsedTexts, school?.name, totalPages]);

  const runtimeFindings = useMemo(() => collectRuntimeFindings({
    state,
    school,
    canonicalDocumentId,
    parsedTexts,
  }), [canonicalDocumentId, parsedTexts, school, state]);

  const fixActions = useMemo(() => createFixActionsFromFindings({
    findings: runtimeFindings,
    paperContent,
    schoolRuleName,
    baselineRuleName,
  }), [baselineRuleName, paperContent, runtimeFindings, schoolRuleName]);

  const totalActionDurationMs = useMemo(() => (
    fixActions.reduce((sum, action) => sum + getActionDuration(action.type, 1), 0)
  ), [fixActions]);

  const allDone = forceCompleted || steps.every((step) => step.status === 'done');
  const active = fixing || demoPlayback;
  const status = getRuntimeStatus({ allDone, active, viewPaused });
  const progressRatio = allDone
    ? 1
    : active && totalActionDurationMs > 0
    ? Math.min(0.99, (fixElapsedMs * speed) / totalActionDurationMs)
    : 0;
  const fixedItems = allDone
    ? fixActions.length
    : Math.min(fixActions.length, Math.floor(progressRatio * fixActions.length));
  const focalAction = fixActions[Math.min(Math.max(fixedItems, 0), Math.max(fixActions.length - 1, 0))] ?? null;
  const currentPage = focalAction?.locator.page ?? 1;
  const currentPaperPage = paperContent.pages[Math.max(0, currentPage - 1)] ?? paperContent.pages[0] ?? null;
  const currentChapter = getPageChapterLabel(currentPaperPage);
  const estimatedRemainingMs = allDone ? 0 : Math.max(0, Math.round((totalActionDurationMs - (fixElapsedMs * speed)) / speed));

  const runtimeStore: FixRuntimeStore = {
    totalItems: fixActions.length || FIX_STEPS.length,
    fixedItems,
    progressPct: Math.round(progressRatio * 100),
    currentChapter,
    currentPage,
    totalPages: paperContent.pages.length,
    elapsedMs: fixElapsedMs,
    estimatedRemainingMs,
    status,
    speed,
  };

  const frameSource = fixActions[liveFrameIndex % Math.max(fixActions.length, 1)] ?? focalAction;
  const activeLiveFrame: LiveDocumentFrame | null = frameSource
    ? {
      chapter: getPageChapterLabel(paperContent.pages[Math.max(0, frameSource.locator.page - 1)]),
      focusAnchor: `第 ${frameSource.locator.page} 页 · 第 ${frameSource.locator.paragraphIndex + 1} 段`,
      rule: frameSource.rule.source === '学校规则' ? frameSource.rule.name : schoolRuleName,
      baseline: frameSource.rule.source === '国标' ? frameSource.rule.name : baselineRuleName,
    }
    : null;

  const unsupportedLegacyDoc = isLegacyDoc(state.doc?.name);
  const canLaunchRealFix = !!state.documentIdentity?.legacyDocId
    && state.documentIdentity.legacyDocId !== 'demo-doc'
    && !!state.schoolId
    && !unsupportedLegacyDoc;

  return {
    allDone,
    activeLiveFrame,
    canLaunchRealFix,
    documentTitle: state.doc?.name || `${documentTitle}.docx`,
    doneCount: steps.filter((step) => step.status === 'done').length,
    fixActions,
    paperContent,
    runtimeFindings,
    runtimeNarrative: fixMessage || '正在按学校规范和国标基线逐项修复论文排版。',
    runtimeStore,
    totalActionDurationMs,
    totalCount: steps.length,
    unsupportedLegacyDoc,
  };
}
