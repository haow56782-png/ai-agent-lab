import { useCallback, useMemo, useRef, useState } from 'react';
import type { FixJobArtifact, FixJobEvent } from '../../api/client';
import type { FixAction } from '../../mock/fixActions';
import type { PaperContent, PaperPage } from '../../mock/paperContent';
import type { PenCursorState } from '../PenCursor';
import type {
  ActiveFixFinding,
  AnnotationLayout,
  FixRuntimeStore,
  LiveDocumentFrame,
  PageDecorations,
  RecentActionMeta,
  VisibleRuleCard,
} from './types';
import {
  clamp,
  getActionDuration,
  getBlockByParagraphIndex,
  getPageChapter,
  getPageTextBlocks,
  summarizeAction,
} from './utils';
import { useFixRuntimeActionPlayback } from './useFixRuntimeActionPlayback';
import { useFixRuntimeAttentionEffects } from './useFixRuntimeAttentionEffects';
import { useFixRuntimePageSync } from './useFixRuntimePageSync';

interface Params {
  runtimeStore: FixRuntimeStore;
  runtimeNarrative: string;
  documentTitle: string;
  activeFrame: LiveDocumentFrame | null;
  paperContent: PaperContent;
  fixActions: FixAction[];
  fixEvents: FixJobEvent[];
  fixArtifacts: FixJobArtifact[];
  onPauseToggle: () => void;
}

export function useFixRuntimePlayback({
  runtimeStore,
  runtimeNarrative,
  documentTitle,
  activeFrame,
  paperContent,
  fixActions,
  fixEvents,
  fixArtifacts,
  onPauseToggle,
}: Params) {
  const pages = paperContent.pages;
  const fallbackPage = useMemo<PaperPage>(() => ({
    pageNumber: 1,
    header: documentTitle,
    footer: '1',
    blocks: [],
  }), [documentTitle]);

  const progressRatio = clamp(runtimeStore.progressPct / 100, 0, 1);
  const targetAppliedCount = runtimeStore.status === 'completed'
    ? fixActions.length
    : runtimeStore.status === 'running' && fixActions.length > 0
    ? Math.max(1, Math.min(fixActions.length, Math.floor(progressRatio * fixActions.length)))
    : Math.min(fixActions.length, Math.floor(progressRatio * fixActions.length));

  const [appliedCount, setAppliedCount] = useState(0);
  const [displayedPageIndex, setDisplayedPageIndex] = useState(() => {
    const firstPage = fixActions[0]?.locator.page || runtimeStore.currentPage || 1;
    return Math.max(0, Math.min(Math.max(pages.length - 1, 0), firstPage - 1));
  });
  const [previousPage, setPreviousPage] = useState<PaperPage | null>(null);
  const [isPageFlipping, setIsPageFlipping] = useState(false);
  const [penState, setPenState] = useState<PenCursorState>('idle');
  const [penPosition, setPenPosition] = useState({ x: -100, y: -100 });
  const [ruleFlashId, setRuleFlashId] = useState<'school' | 'baseline' | null>(null);
  const [freshInsertIds, setFreshInsertIds] = useState<string[]>([]);
  const [annotationLayouts, setAnnotationLayouts] = useState<Record<string, AnnotationLayout>>({});
  const [manualAutoScrollLocked, setManualAutoScrollLocked] = useState(false);
  const [penTransitionMs, setPenTransitionMs] = useState(90);
  const [activeActionIds, setActiveActionIds] = useState<string[]>([]);
  const [recentActionMeta, setRecentActionMeta] = useState<Record<string, RecentActionMeta>>({});
  const [showPauseHint, setShowPauseHint] = useState(false);
  const [diffPulse, setDiffPulse] = useState(false);
  const [paperBow, setPaperBow] = useState(false);
  const [introPlayed, setIntroPlayed] = useState(false);
  const [introRunning, setIntroRunning] = useState(false);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);

  const charRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const livePageRef = useRef<HTMLDivElement | null>(null);
  const rightFeedRef = useRef<HTMLDivElement | null>(null);
  const ignoreScrollRef = useRef(false);
  const prevStatusRef = useRef<FixRuntimeStore['status']>(runtimeStore.status);
  const pauseHintHideTimerRef = useRef<number | null>(null);
  const pauseHintShowTimerRef = useRef<number | null>(null);

  const activeAction = useMemo(
    () => fixActions.find(action => action.id === activeActionIds[0]) || null,
    [activeActionIds, fixActions]
  );
  const selectedAction = useMemo(
    () => selectedActionId ? fixActions.find(action => action.id === selectedActionId) || null : null,
    [fixActions, selectedActionId],
  );

  const appliedActions = useMemo(
    () => fixActions.slice(0, Math.min(appliedCount, fixActions.length)),
    [appliedCount, fixActions]
  );

  const pendingAction = runtimeStore.status === 'running' && appliedCount < targetAppliedCount
    ? fixActions[appliedCount] || null
    : null;
  const focalAction = activeAction || selectedAction || pendingAction || appliedActions[appliedActions.length - 1] || null;
  const activeParagraphKey = activeActionIds.length > 1 && activeAction
    ? `${activeAction.locator.page}:${activeAction.locator.paragraphIndex}`
    : null;

  const currentPaperPage = pages[displayedPageIndex] || fallbackPage;
  const displayedPageNumber = currentPaperPage.pageNumber || 1;
  const displayedChapter = getPageChapter(currentPaperPage);
  const desiredPageIndex = focalAction
    ? clamp(focalAction.locator.page - 1, 0, Math.max(pages.length - 1, 0))
    : clamp(runtimeStore.currentPage - 1, 0, Math.max(pages.length - 1, 0));

  const activeActionSet = useMemo(() => {
    const next = new Set(activeActionIds);
    if (selectedActionId) next.add(selectedActionId);
    return next;
  }, [activeActionIds, selectedActionId]);
  const visibleActions = useMemo(
    () => {
      const candidates = activeActionIds.length > 0 || selectedActionId
        ? [...appliedActions, ...fixActions.filter(action => activeActionSet.has(action.id))]
        : appliedActions;
      const byId = new Map(candidates.map(action => [action.id, action]));
      return Array.from(byId.values());
    },
    [activeActionIds.length, activeActionSet, appliedActions, fixActions, selectedActionId]
  );

  const pageTextBlocks = useMemo(() => getPageTextBlocks(currentPaperPage), [currentPaperPage]);
  const pageTextBlockMap = useMemo(
    () => new Map(pageTextBlocks.map(block => [block.paragraphIndex, block])),
    [pageTextBlocks]
  );

  const currentPageActions = useMemo(
    () => visibleActions.filter(action => action.locator.page === currentPaperPage.pageNumber),
    [currentPaperPage.pageNumber, visibleActions]
  );
  const focalPage = focalAction ? pages[focalAction.locator.page - 1] || fallbackPage : currentPaperPage;
  const focalBlock = focalAction ? getBlockByParagraphIndex(focalPage, focalAction.locator.paragraphIndex) : null;
  const activeFixFinding = useMemo<ActiveFixFinding | null>(() => {
    if (!focalAction) return null;
    const page = pages[focalAction.locator.page - 1] || fallbackPage;
    const summary = summarizeAction(page, focalAction);
    return {
      id: focalAction.findingId,
      label: focalAction.findingLabel,
      chapter: summary.chapter,
      page: focalAction.locator.page,
      ruleLabel: summary.ruleLabel,
    };
  }, [fallbackPage, focalAction, pages]);

  const visibleRuleCards = useMemo<VisibleRuleCard[]>(() => {
    const refs = focalBlock?.ruleRefs || [];
    if (refs.length === 0 && activeFrame) {
      return [
        {
          id: '学校规则:fallback',
          source: '学校规则',
          code: 'USTC-vAuto',
          name: activeFrame.rule,
          summary: '当前章节正在按学校模板规则逐条校对。',
          hitCount: 0,
        },
        {
          id: '国标:fallback',
          source: '国标',
          code: 'GB/T 7713.1-2025',
          name: activeFrame.baseline,
          summary: '当前章节同时按国标基线检查版式与著录一致性。',
          hitCount: 0,
        },
      ];
    }
    return refs.map((ruleRef) => {
      const matchedAction = visibleActions.find(action => action.rule.source === ruleRef.source && action.rule.name.includes(ruleRef.code));
      const hitCount = visibleActions.filter(action => action.rule.source === ruleRef.source && action.rule.name.includes(ruleRef.code)).length;
      return {
        id: `${ruleRef.source}:${ruleRef.code}`,
        source: ruleRef.source,
        code: ruleRef.code,
        name: ruleRef.name,
        summary: ruleRef.summary,
        hitCount: hitCount || (matchedAction ? 1 : 0),
      };
    });
  }, [activeFrame?.baseline, activeFrame?.rule, focalBlock?.ruleRefs, visibleActions]);

  const leftRules = useMemo(() => visibleRuleCards.slice(0, 3), [visibleRuleCards]);
  const hiddenRuleCount = Math.max(0, visibleRuleCards.length - leftRules.length);

  const pageDecorations = useMemo<PageDecorations>(() => {
    const deletedKeys = new Set<string>();
    const activeDeletedKeys = new Set<string>();
    const replacements = new Map<string, { actionId: string; payload: string; active: boolean }>();
    const inserts = new Map<string, FixAction[]>();
    const annotations: FixAction[] = [];

    currentPageActions.forEach((action) => {
      const blockMeta = pageTextBlockMap.get(action.locator.paragraphIndex);
      if (!blockMeta) return;
      const blockLength = Array.from(blockMeta.block.content).length;
      const start = clamp(action.locator.charOffset, 0, Math.max(blockLength - 1, 0));
      const end = clamp(start + Math.max(action.locator.length, 1) - 1, start, Math.max(blockLength - 1, 0));

      if (action.type === 'annotate') {
        annotations.push(action);
        return;
      }

      if (action.type === 'insert') {
        const key = `${action.locator.paragraphIndex}:${Math.min(action.locator.charOffset, blockLength)}`;
        inserts.set(key, [...(inserts.get(key) || []), action]);
        return;
      }

      for (let charIndex = start; charIndex <= end; charIndex += 1) {
        const key = `${action.locator.paragraphIndex}:${charIndex}`;
        deletedKeys.add(key);
        if (activeActionSet.has(action.id)) activeDeletedKeys.add(key);
      }

      if (action.type === 'replace') {
        replacements.set(`${action.locator.paragraphIndex}:${start}`, {
          actionId: action.id,
          payload: action.payload,
          active: activeActionSet.has(action.id),
        });
      }
    });

    return { deletedKeys, activeDeletedKeys, replacements, inserts, annotations };
  }, [activeActionSet, currentPageActions, pageTextBlockMap]);

  const annotationStateMap = useMemo<Map<string, 'active' | 'stale'>>(() => {
    const staleThreshold = Math.max(0, pageDecorations.annotations.length - 5);
    return new Map(pageDecorations.annotations.map((action, index) => [action.id, index < staleThreshold ? 'stale' : 'active']));
  }, [pageDecorations.annotations]);

  const visualRemainingMs = useMemo(() => {
    if (runtimeStore.status === 'completed') return 0;
    return fixActions
      .slice(Math.min(appliedCount, fixActions.length))
      .reduce((sum, action) => sum + getActionDuration(action.type, runtimeStore.speed), 0);
  }, [appliedCount, fixActions, runtimeStore.speed, runtimeStore.status]);

  const visualProgressRatio = useMemo(() => {
    if (runtimeStore.status === 'completed') return 1;
    if (fixActions.length === 0) return progressRatio;
    return clamp(appliedCount / fixActions.length, 0, 1);
  }, [appliedCount, fixActions.length, progressRatio, runtimeStore.status]);

  const visualCompleted = runtimeStore.status === 'completed' || (fixActions.length > 0 && appliedCount >= fixActions.length);
  const viewDiffEnabled = visualCompleted && runtimeStore.totalItems > 0;

  const visualRuntimeStore = useMemo<FixRuntimeStore>(() => {
    const derivedFixedItems = runtimeStore.totalItems <= 0
      ? 0
      : visualCompleted
      ? runtimeStore.totalItems
      : Math.min(runtimeStore.totalItems, Math.floor(visualProgressRatio * runtimeStore.totalItems));
    return {
      ...runtimeStore,
      status: visualCompleted ? 'completed' : runtimeStore.status,
      progressPct: visualCompleted ? 100 : Math.min(99, Math.round(visualProgressRatio * 100)),
      fixedItems: derivedFixedItems,
      currentPage: displayedPageNumber,
      currentChapter: displayedChapter,
      estimatedRemainingMs: visualCompleted ? 0 : visualRemainingMs,
    };
  }, [
    displayedChapter,
    displayedPageNumber,
    runtimeStore,
    visualCompleted,
    visualProgressRatio,
    visualRemainingMs,
  ]);

  useFixRuntimePageSync({
    runtimeStatus: runtimeStore.status,
    fixActionsLength: fixActions.length,
    targetAppliedCount,
    appliedCount,
    activeActionIdsLength: activeActionIds.length,
    isPageFlipping,
    desiredPageIndex,
    displayedPageIndex,
    currentPaperPage,
    pagesLength: pages.length,
    recentActionMeta,
    annotations: pageDecorations.annotations,
    pageTextBlockMap,
    charRefs,
    livePageRef,
    setAppliedCount,
    setActiveActionIds,
    setPenState,
    setPreviousPage,
    setIsPageFlipping,
    setDisplayedPageIndex,
    setAnnotationLayouts,
  });

  const { timelineRows } = useFixRuntimeActionPlayback({
    visualRuntimeStore,
    isPageFlipping,
    activeAction: activeAction || selectedAction,
    activeActionIds,
    appliedCount,
    displayedPageIndex,
    fixActions,
    targetAppliedCount,
    pages,
    fallbackPage,
    visibleActions,
    activeActionSet,
    fixArtifacts,
    fixEvents,
    runtimeNarrative,
    setPenState,
    setAppliedCount,
    setActiveActionIds,
    setRuleFlashId,
    setFreshInsertIds,
    setRecentActionMeta,
  });

  const { handleRightFeedScroll } = useFixRuntimeAttentionEffects({
    visualRuntimeStore,
    currentPaperPage,
    pageTextBlocks,
    pageTextBlockMap,
    activeAction: activeAction || selectedAction,
    annotationLayouts,
    charRefs,
    livePageRef,
    rightFeedRef,
    ignoreScrollRef,
    prevStatusRef,
    pauseHintHideTimerRef,
    pauseHintShowTimerRef,
    timelineRows,
    isPageFlipping,
    introPlayed,
    introRunning,
    manualAutoScrollLocked,
    onPauseToggle,
    setPenState,
    setPenPosition,
    setPenTransitionMs,
    setPaperBow,
    setDiffPulse,
    setShowPauseHint,
    setIntroPlayed,
    setIntroRunning,
    setManualAutoScrollLocked,
  });

  const handleJumpToAction = useCallback((row: { id: string; page: number }) => {
    if (row.page < 1 || row.page > pages.length) return;
    setSelectedActionId(row.id);
    setDisplayedPageIndex(row.page - 1);
    setManualAutoScrollLocked(true);
  }, [pages.length]);

  return {
    displayedPageNumber,
    displayedChapter,
    activeFixFinding,
    visualRuntimeStore,
    leftRules,
    hiddenRuleCount,
    ruleFlashId,
    currentPaperPage,
    previousPage,
    isPageFlipping,
    paperBow,
    pageDecorations,
    annotationLayouts,
    activeActionSet,
    activeParagraphKey,
    currentPageActions,
    recentActionMeta,
    annotationStateMap,
    freshInsertIds,
    charRefs,
    livePageRef,
    showPauseHint,
    penPosition,
    penState,
    penTransitionMs,
    appliedCount,
    timelineRows,
    viewDiffEnabled,
    diffPulse,
    rightFeedRef,
    handleRightFeedScroll,
    handleJumpToAction,
  };
}
