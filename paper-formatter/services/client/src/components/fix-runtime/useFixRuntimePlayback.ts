import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FixJobArtifact, FixJobEvent } from '../../api/client';
import type { FixAction } from '../../mock/fixActions';
import type { PaperContent, PaperPage } from '../../mock/paperContent';
import type { PenCursorState } from '../PenCursor';
import type {
  ActiveFixFinding,
  AnnotationLayout,
  FixRuntimeStore,
  FixFindingStatusSummary,
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

const PAPER_DECORATION_WINDOW_MS = 1800;
const MIN_COMPLETED_SERVER_REPLAY_MS = 180000;

// Maps thesisSubset to keyword patterns for matching rule cards to subsets.
const SUBSET_MATCHERS: Record<string, RegExp> = {
  // Specific matchers first (they check more distinctive keywords)
  floating_object: /图片|印章|水印|浮动|图层|覆盖正文|shape/i,
  table: /表格|三线表|keep-together/i,
  table_caption: /图表|题注/i,
  reference: /参考文献|著录|DOI|7714/i,
  citation: /交叉引用|引用/i,
  footnote: /脚注/i,
  page_number: /页码|分节|页脚/i,
  header_footer: /页眉|页脚/i,
  heading: /标题|章节|层级|题名/i,
  page_canvas: /页边距|版芯|页面|纸张|装订线/i,
  cover: /封面|声明|题名页/i,
  abstract_zh: /摘要|关键词/i,
  toc: /目录|TOC/i,
  figure: /图片|图题/i,
  // paragraph last — it has the most general keywords
  paragraph: /正文|段落|字体|行距|缩进|首行|样式/i,
};

// Resolves a thesisSubset from an action's findingLabel or rule text using
// the same keyword approach as resolveFixTypeForFinding in findingFixActionAdapter.
function resolveSubsetFromActionText(text: string): string | null {
  for (const [subset, regex] of Object.entries(SUBSET_MATCHERS)) {
    if (regex.test(text)) return subset;
  }
  return null;
}

// Tags a rule card with a thesisSubset by matching its name and summary text.
function tagRuleSubset(card: VisibleRuleCard): VisibleRuleCard {
  if (card.thesisSubset) return card;
  const text = `${card.name} ${card.summary}`;
  const subset = resolveSubsetFromActionText(text);
  return subset ? { ...card, thesisSubset: subset } : card;
}

function collectArtifactFindingIds(
  fixArtifacts: FixJobArtifact[],
  includeArtifact: (artifact: FixJobArtifact) => boolean = () => true,
): Set<string> {
  const findingIds = new Set<string>();
  for (const artifact of fixArtifacts) {
    if (!includeArtifact(artifact)) continue;
    if (artifact.finding_id) findingIds.add(artifact.finding_id);
    for (const relatedId of artifact.related_finding_ids || []) findingIds.add(relatedId);
  }
  return findingIds;
}

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

  const serverCompleted = runtimeStore.status === 'completed';
  const hasServerPlaybackEvidence = fixArtifacts.length > 0 || fixEvents.length > 0;
  const shouldReplayCompletedServerResult = serverCompleted && hasServerPlaybackEvidence;
  const serverWrittenFindingIds = useMemo(
    () => collectArtifactFindingIds(fixArtifacts, (artifact) => artifact.status === 'ready'),
    [fixArtifacts],
  );
  const serverNeedsReviewFindingIds = useMemo(
    () => collectArtifactFindingIds(fixArtifacts, (artifact) => artifact.status === 'needs_review'),
    [fixArtifacts],
  );
  const playbackActions = useMemo(() => {
    if (!shouldReplayCompletedServerResult || serverWrittenFindingIds.size === 0) return fixActions;
    const artifactBackedActions = fixActions.filter((action) => serverWrittenFindingIds.has(action.findingId));
    return artifactBackedActions.length > 0 ? artifactBackedActions : fixActions;
  }, [fixActions, serverWrittenFindingIds, shouldReplayCompletedServerResult]);
  const serverCompletedReplayDone = shouldReplayCompletedServerResult && (playbackActions.length === 0 || appliedCount >= playbackActions.length);
  const playbackRunningAfterServerDone = shouldReplayCompletedServerResult && !serverCompletedReplayDone;
  const progressRatio = clamp(runtimeStore.progressPct / 100, 0, 1);
  const targetAppliedCount = serverCompleted
    ? playbackActions.length
    : runtimeStore.status === 'running' && playbackActions.length > 0
    ? Math.max(1, Math.min(playbackActions.length, Math.floor(progressRatio * playbackActions.length)))
    : Math.min(playbackActions.length, Math.floor(progressRatio * playbackActions.length));

  const charRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const livePageRef = useRef<HTMLDivElement | null>(null);
  const rightFeedRef = useRef<HTMLDivElement | null>(null);
  const ignoreScrollRef = useRef(false);
  const prevStatusRef = useRef<FixRuntimeStore['status']>(runtimeStore.status);
  const serverReplaySignatureRef = useRef<string | null>(null);
  const pauseHintHideTimerRef = useRef<number | null>(null);
  const pauseHintShowTimerRef = useRef<number | null>(null);

  const activeAction = useMemo(
    () => playbackActions.find(action => action.id === activeActionIds[0]) || null,
    [activeActionIds, playbackActions]
  );
  const selectedAction = useMemo(
    () => selectedActionId ? playbackActions.find(action => action.id === selectedActionId) || null : null,
    [playbackActions, selectedActionId],
  );

  const appliedActions = useMemo(
    () => playbackActions.slice(0, Math.min(appliedCount, playbackActions.length)),
    [appliedCount, playbackActions]
  );
  const totalFindingCount = useMemo(() => {
    const actionFindingCount = new Set(fixActions.map((action) => action.findingId).filter(Boolean)).size;
    return Math.max(runtimeStore.totalItems, actionFindingCount, serverWrittenFindingIds.size);
  }, [fixActions, runtimeStore.totalItems, serverWrittenFindingIds]);
  const playableFindingCount = useMemo(() => {
    const count = new Set(playbackActions.map((action) => action.findingId).filter(Boolean)).size;
    return count || Math.min(runtimeStore.totalItems, playbackActions.length);
  }, [playbackActions, runtimeStore.totalItems]);
  const appliedFindingCount = useMemo(() => {
    if (appliedActions.length === 0) return 0;
    return new Set(appliedActions.map((action) => action.findingId).filter(Boolean)).size;
  }, [appliedActions]);
  const findingStatusSummary = useMemo<FixFindingStatusSummary>(() => {
    const writtenBack = Math.min(appliedFindingCount, totalFindingCount);
    const needsReview = serverNeedsReviewFindingIds.size;
    const notAutoFixed = Math.max(0, totalFindingCount - playableFindingCount - needsReview);
    return {
      total: totalFindingCount,
      autoFixableTotal: playableFindingCount,
      writtenBack,
      needsReview,
      notAutoFixed,
    };
  }, [appliedFindingCount, playableFindingCount, serverNeedsReviewFindingIds.size, totalFindingCount]);
  const serverAppliedFindingCount = useMemo(() => {
    return serverWrittenFindingIds.size;
  }, [serverWrittenFindingIds]);

  useEffect(() => {
    if (!shouldReplayCompletedServerResult || playbackActions.length === 0 || serverWrittenFindingIds.size === 0) return;
    const replaySignature = Array.from(serverWrittenFindingIds).sort().join('|');
    if (serverReplaySignatureRef.current === replaySignature) return;
    serverReplaySignatureRef.current = replaySignature;
    setAppliedCount(0);
    setActiveActionIds([]);
    setSelectedActionId(null);
    setRecentActionMeta({});
    setPenState('idle');
    const firstAction = playbackActions[0];
    if (firstAction) {
      setDisplayedPageIndex(clamp(firstAction.locator.page - 1, 0, Math.max(pages.length - 1, 0)));
    }
  }, [
    pages.length,
    playbackActions,
    serverWrittenFindingIds,
    shouldReplayCompletedServerResult,
  ]);

  const pendingAction = (runtimeStore.status === 'running' || playbackRunningAfterServerDone) && appliedCount < targetAppliedCount
    ? playbackActions[appliedCount] || null
    : null;
  const focalAction = activeAction || selectedAction || pendingAction || appliedActions[appliedActions.length - 1] || null;
  const activeThesisSubset = useMemo<string | null>(() => {
    if (!focalAction) return null;
    return resolveSubsetFromActionText(`${focalAction.findingLabel} ${focalAction.rule.name}`);
  }, [focalAction]);
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
        ? [...appliedActions, ...playbackActions.filter(action => activeActionSet.has(action.id))]
        : appliedActions;
      const byId = new Map(candidates.map(action => [action.id, action]));
      return Array.from(byId.values());
    },
    [activeActionIds.length, activeActionSet, appliedActions, playbackActions, selectedActionId]
  );
  const paperVisibleActions = useMemo(() => {
    const now = Date.now();
    const candidates = playbackActions.filter((action) => {
      if (activeActionSet.has(action.id)) return true;
      if (selectedActionId === action.id) return true;
      const recentMeta = recentActionMeta[action.id];
      return Boolean(recentMeta && now - recentMeta.completedAt <= PAPER_DECORATION_WINDOW_MS);
    });
    if (candidates.length > 0) return candidates;
    return focalAction ? [focalAction] : [];
  }, [activeActionSet, focalAction, playbackActions, recentActionMeta, selectedActionId]);

  const pageTextBlocks = useMemo(() => getPageTextBlocks(currentPaperPage), [currentPaperPage]);
  const pageTextBlockMap = useMemo(
    () => new Map(pageTextBlocks.map(block => [block.paragraphIndex, block])),
    [pageTextBlocks]
  );

  const currentPageActions = useMemo(
    () => paperVisibleActions.filter(action => action.locator.page === currentPaperPage.pageNumber),
    [currentPaperPage.pageNumber, paperVisibleActions]
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
    let cards: VisibleRuleCard[];

    if (refs.length === 0 && activeFrame) {
      cards = [
        {
          id: '学校规则:fallback',
          source: '学校规则',
          code: 'USTC-vAuto',
          name: activeFrame.rule,
          summary: '当前章节正在按学校模板规则逐条校对。',
          hitCount: 0,
          // Fallback cards represent the active finding's rule context,
          // so inherit thesisSubset directly from the active finding.
          thesisSubset: activeThesisSubset || undefined,
        },
        {
          id: '国标:fallback',
          source: '国标',
          code: 'GB/T 7713.1-2025',
          name: activeFrame.baseline,
          summary: '当前章节同时按国标基线检查版式与著录一致性。',
          hitCount: 0,
          thesisSubset: activeThesisSubset || undefined,
        },
      ];
    } else {
      cards = refs.map((ruleRef) => {
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
    }

    // Tag each card with its thesisSubset by matching rule name/summary text.
    cards = cards.map(tagRuleSubset);

    // Filter to only show rules matching the active finding's thesisSubset.
    // If filtering would yield 0 cards, show all tagged cards instead so the
    // panel never goes completely empty when the current block doesn't happen
    // to carry a rule ref for the active subset.
    if (activeThesisSubset) {
      const filtered = cards.filter((card) => card.thesisSubset === activeThesisSubset);
      if (filtered.length > 0) cards = filtered;
    }

    return cards;
  }, [activeFrame?.baseline, activeFrame?.rule, activeThesisSubset, focalBlock?.ruleRefs, visibleActions]);

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
    if (serverCompletedReplayDone) return 0;
    const remainingMs = playbackActions
      .slice(Math.min(appliedCount, playbackActions.length))
      .reduce((sum, action) => sum + getActionDuration(action.type, runtimeStore.speed), 0);
    const replayRemainingMs = playbackRunningAfterServerDone
      ? Math.ceil((MIN_COMPLETED_SERVER_REPLAY_MS / Math.max(runtimeStore.speed, 1)) * (1 - clamp(appliedCount / Math.max(playbackActions.length, 1), 0, 1)))
      : 0;
    return runtimeStore.status === 'running'
      ? Math.max(remainingMs, runtimeStore.estimatedRemainingMs, 1000)
      : playbackRunningAfterServerDone
      ? Math.max(remainingMs, replayRemainingMs, 1000)
      : remainingMs;
  }, [appliedCount, playbackActions, playbackRunningAfterServerDone, runtimeStore.estimatedRemainingMs, runtimeStore.speed, runtimeStore.status, serverCompletedReplayDone]);

  const visualProgressRatio = useMemo(() => {
    if (serverCompletedReplayDone) return 1;
    if (playbackActions.length === 0) return progressRatio;
    return clamp(appliedCount / playbackActions.length, 0, 1);
  }, [appliedCount, playbackActions.length, progressRatio, serverCompletedReplayDone]);

  const visualCompleted = serverCompleted && (!shouldReplayCompletedServerResult || serverCompletedReplayDone);
  const viewDiffEnabled = visualCompleted && totalFindingCount > 0;

  const visualRuntimeStore = useMemo<FixRuntimeStore>(() => {
    const observedFixedItems = playbackRunningAfterServerDone
      ? appliedFindingCount
      : Math.max(serverAppliedFindingCount, appliedFindingCount);
    const derivedFixedItems = totalFindingCount <= 0
      ? 0
      : visualCompleted
      ? totalFindingCount
      : Math.min(Math.max(totalFindingCount - 1, 0), observedFixedItems);
    return {
      ...runtimeStore,
      totalItems: totalFindingCount,
      status: visualCompleted ? 'completed' : playbackRunningAfterServerDone ? 'running' : runtimeStore.status,
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
    totalFindingCount,
    appliedFindingCount,
    serverAppliedFindingCount,
    visualCompleted,
    playbackRunningAfterServerDone,
    visualProgressRatio,
    visualRemainingMs,
  ]);

  useFixRuntimePageSync({
    runtimeStatus: visualRuntimeStore.status,
    fixActionsLength: playbackActions.length,
    targetAppliedCount,
    appliedCount,
    allowBulkCatchUp: !playbackRunningAfterServerDone,
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
    fixActions: playbackActions,
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

  const handleJumpToAction = useCallback((row: { actionId: string; page: number }) => {
    if (row.page < 1 || row.page > pages.length) return;
    setSelectedActionId(row.actionId);
    setDisplayedPageIndex(row.page - 1);
    setManualAutoScrollLocked(true);
  }, [pages.length]);

  return {
    displayedPageNumber,
    displayedChapter,
    activeFixFinding,
    activeThesisSubset,
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
    appliedFindingCount,
    totalFindingCount,
    findingStatusSummary,
    timelineRows,
    viewDiffEnabled,
    diffPulse,
    rightFeedRef,
    handleRightFeedScroll,
    handleJumpToAction,
  };
}
