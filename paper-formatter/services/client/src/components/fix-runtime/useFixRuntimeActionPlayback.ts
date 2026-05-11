import { useEffect, useMemo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { FixJobArtifact, FixJobEvent } from '../../api/client';
import type { FixAction } from '../../mock/fixActions';
import type { PaperPage } from '../../mock/paperContent';
import type { PenCursorState } from '../PenCursor';
import type {
  FixRuntimeStore,
  RecentActionMeta,
  TimelineRow,
} from './types';
import {
  formatTimestamp,
  getActionDuration,
  getSimulatedElapsedMs,
  resolveRuleCardId,
  summarizeAction,
} from './utils';

interface Params {
  visualRuntimeStore: FixRuntimeStore;
  isPageFlipping: boolean;
  activeAction: FixAction | null;
  activeActionIds: string[];
  appliedCount: number;
  displayedPageIndex: number;
  fixActions: FixAction[];
  targetAppliedCount: number;
  pages: PaperPage[];
  fallbackPage: PaperPage;
  visibleActions: FixAction[];
  activeActionSet: Set<string>;
  fixArtifacts: FixJobArtifact[];
  fixEvents: FixJobEvent[];
  runtimeNarrative: string;
  setPenState: Dispatch<SetStateAction<PenCursorState>>;
  setAppliedCount: Dispatch<SetStateAction<number>>;
  setActiveActionIds: Dispatch<SetStateAction<string[]>>;
  setRuleFlashId: Dispatch<SetStateAction<'school' | 'baseline' | null>>;
  setFreshInsertIds: Dispatch<SetStateAction<string[]>>;
  setRecentActionMeta: Dispatch<SetStateAction<Record<string, RecentActionMeta>>>;
}

export function useFixRuntimeActionPlayback({
  visualRuntimeStore,
  isPageFlipping,
  activeAction,
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
}: Params) {
  useEffect(() => {
    if (visualRuntimeStore.status === 'paused' || visualRuntimeStore.status === 'completed' || isPageFlipping) return;
    if (appliedCount >= targetAppliedCount || appliedCount >= fixActions.length) {
      setPenState('idle');
      return;
    }

    const nextAction = activeAction || fixActions[appliedCount];
    if (!nextAction) return;
    if (nextAction.locator.page - 1 !== displayedPageIndex) return;

    const burstActions = visualRuntimeStore.speed === 4
      ? fixActions.slice(appliedCount).filter(action =>
          action.locator.page === nextAction.locator.page &&
          action.locator.paragraphIndex === nextAction.locator.paragraphIndex,
        )
      : [nextAction];
    const previousAction = fixActions[Math.max(appliedCount - 1, 0)];
    const cadenceGap = appliedCount === 0
      ? 0
      : previousAction.locator.page === nextAction.locator.page && previousAction.locator.paragraphIndex === nextAction.locator.paragraphIndex
      ? 350
      : 600;
    const baseDuration = visualRuntimeStore.speed === 4
      ? Math.max(220, cadenceGap)
      : Math.max(...burstActions.map(action => getActionDuration(action.type, visualRuntimeStore.speed)), cadenceGap);

    const isResumingAction = Boolean(activeAction);
    if (!isResumingAction) {
      setActiveActionIds(burstActions.map(action => action.id));
      setRuleFlashId(resolveRuleCardId(nextAction.rule.source));
      if (nextAction.type === 'insert') {
        setFreshInsertIds(prev => (prev.includes(nextAction.id) ? prev : [...prev, nextAction.id]));
      }
    }

    const flashTimer = isResumingAction
      ? null
      : window.setTimeout(() => {
          setRuleFlashId(prev => (prev === resolveRuleCardId(nextAction.rule.source) ? null : prev));
        }, 720);

    const insertFadeTimer = !isResumingAction && nextAction.type === 'insert'
      ? window.setTimeout(() => {
          setFreshInsertIds(prev => prev.filter(id => id !== nextAction.id));
        }, 1500)
      : null;

    const actionTimer = window.setTimeout(() => {
      setAppliedCount(prev => Math.min(prev + burstActions.length, fixActions.length));
      setActiveActionIds([]);
      setRecentActionMeta(prev => {
        const timestamp = Date.now();
        const next = { ...prev };
        burstActions.forEach((action) => {
          next[action.id] = {
            completedAt: timestamp,
            page: action.locator.page,
            paragraphIndex: action.locator.paragraphIndex,
          };
        });
        return next;
      });
    }, baseDuration);

    return () => {
      if (flashTimer) window.clearTimeout(flashTimer);
      window.clearTimeout(actionTimer);
      if (insertFadeTimer) window.clearTimeout(insertFadeTimer);
    };
  }, [
    activeAction,
    activeActionIds,
    appliedCount,
    displayedPageIndex,
    fixActions,
    isPageFlipping,
    setActiveActionIds,
    setAppliedCount,
    setFreshInsertIds,
    setPenState,
    setRecentActionMeta,
    setRuleFlashId,
    targetAppliedCount,
    visualRuntimeStore.speed,
    visualRuntimeStore.status,
  ]);

  useEffect(() => {
    const cleanupTimer = window.setInterval(() => {
      setRecentActionMeta(prev => {
        const now = Date.now();
        const nextEntries = Object.entries(prev).filter(([, value]) => now - value.completedAt <= 8000);
        if (nextEntries.length === Object.keys(prev).length) return prev;
        return Object.fromEntries(nextEntries);
      });
    }, 1000);
    return () => window.clearInterval(cleanupTimer);
  }, [setRecentActionMeta]);

  const timelineRows = useMemo<TimelineRow[]>(() => {
    const simulatedElapsedMs = getSimulatedElapsedMs(visualRuntimeStore);
    if (visibleActions.length > 0) {
      return visibleActions
        .slice(-20)
        .reverse()
        .map((action) => {
          const page = pages[action.locator.page - 1] || fallbackPage;
          const summary = summarizeAction(page, action);
          return {
            id: action.id,
            timestamp: formatTimestamp(Math.min(simulatedElapsedMs, action.timestamp)),
            chapter: summary.chapter,
            page: action.locator.page,
            paragraphIndex: action.locator.paragraphIndex,
            before: summary.before,
            after: summary.after,
            ruleLabel: summary.ruleLabel,
            type: summary.type,
            status: activeActionSet.has(action.id)
              ? 'live'
              : action.type === 'annotate'
              ? 'needs-review'
              : 'done',
          };
        });
    }

    const artifactRows = fixArtifacts
      .slice(-4)
      .reverse()
      .map((artifact, index) => {
        const status: TimelineRow['status'] = index === 0 ? 'live' : 'done';
        return {
          id: `artifact-${artifact.id}`,
          timestamp: formatTimestamp(Math.max(0, simulatedElapsedMs - (index * 1400))),
          chapter: artifact.chapter || visualRuntimeStore.currentChapter,
          page: visualRuntimeStore.currentPage,
          paragraphIndex: index,
          before: artifact.sourceSnippet || artifact.title || '正在准备修复动作',
          after: artifact.summary || artifact.details?.[0] || runtimeNarrative,
          ruleLabel: '服务端修复产物',
          type: 'annotate' as const,
          status,
        };
      });

    if (artifactRows.length > 0) return artifactRows;

    return fixEvents
      .slice(-4)
      .reverse()
      .map((event, index) => {
        const status: TimelineRow['status'] = index === 0 ? 'live' : 'done';
        return {
          id: `event-${event.id}`,
          timestamp: formatTimestamp(Math.max(0, simulatedElapsedMs - (index * 1200))),
          chapter: visualRuntimeStore.currentChapter,
          page: visualRuntimeStore.currentPage,
          paragraphIndex: index,
          before: event.title || event.stage,
          after: event.detail || runtimeNarrative,
          ruleLabel: '服务端阶段事件',
          type: 'annotate' as const,
          status,
        };
      });
  }, [activeActionSet, fallbackPage, fixArtifacts, fixEvents, pages, runtimeNarrative, visibleActions, visualRuntimeStore]);

  return { timelineRows };
}
