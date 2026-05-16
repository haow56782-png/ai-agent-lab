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
const FIX_TYPE_LABEL: Record<string, string> = {
  margin: '页面边距',
  body_style: '正文样式',
  heading: '标题层级',
  page_number: '页码与分节',
  cover: '封面与声明',
  toc: '目录',
  duplication_preprocess: '查重预处理',
  header_footer: '页眉页脚',
  abstract_format: '摘要与关键词',
  cross_ref: '交叉引用',
  caption: '图表题注',
  reference_format: '参考文献',
  table_format: '表格样式',
  image_format: '图片样式',
  punctuation: '标点符号',
};

function getArtifactRuleLabel(artifact: FixJobArtifact): string {
  const typeLabel = FIX_TYPE_LABEL[artifact.fixType] || '版式修复';
  return `${typeLabel} · 学校规范`;
}

import {
  formatTimestamp,
  getActionDuration,
  getFindingCardTitle,
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
    const remainingActionCount = Math.max(1, targetAppliedCount - appliedCount);
    const pacedDuration = visualRuntimeStore.estimatedRemainingMs > 0
      ? Math.ceil(visualRuntimeStore.estimatedRemainingMs / remainingActionCount)
      : 0;
    const actionDuration = visualRuntimeStore.speed === 4
      ? baseDuration
      : Math.max(baseDuration, pacedDuration);

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
    }, actionDuration);

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

    // When job is done, prefer server artifacts over local visible actions
    // to ensure actual fix steps are shown in the timeline
    if (visualRuntimeStore.status === 'completed' && fixArtifacts.length > 0) {
      return fixArtifacts
        .slice()
        .reverse()
        .map((artifact, index) => {
          const status: TimelineRow['status'] = 'done';
          return {
            id: `artifact-${artifact.id}`,
            actionId: `artifact-${artifact.id}`,
            findingId: artifact.finding_id || artifact.related_finding_ids?.[0] || `artifact-finding-${artifact.id}`,
            findingLabel: artifact.title || '修复产物',
            findingTitle: artifact.title || '修复产物',
            timestamp: formatTimestamp(Math.max(0, simulatedElapsedMs - (index * 1400))),
            chapter: artifact.chapter || visualRuntimeStore.currentChapter,
            page: visualRuntimeStore.currentPage,
            paragraphIndex: index,
            stateLabel: '已写回修复稿',
            stateSummary: '这处发现的修复结果已回传到当前工作台。',
            recentActionSummary: artifact.summary || artifact.title || '修复动作已完成',
            progressSummary: null,
            ruleLabel: getArtifactRuleLabel(artifact),
            type: 'annotate' as const,
            status,
            actionCount: 1,
          };
        });
    }

    if (visualRuntimeStore.status === 'completed' && fixEvents.length > 0) {
      return fixEvents
        .filter(event => event.type !== 'stage' && event.type !== 'warning' && event.type !== 'error')
        .slice()
        .reverse()
        .map((event, index) => {
          const status: TimelineRow['status'] = 'done';
          return {
            id: `event-${event.id}`,
            actionId: `event-${event.id}`,
            findingId: event.finding_id || event.related_finding_ids?.[0] || `event-finding-${event.id}`,
            findingLabel: event.title || event.stage || '修复事件',
            findingTitle: event.title || event.stage || '修复事件',
            timestamp: formatTimestamp(Math.max(0, simulatedElapsedMs - (index * 1200))),
            chapter: visualRuntimeStore.currentChapter,
            page: visualRuntimeStore.currentPage,
            paragraphIndex: index,
            stateLabel: '阶段已完成',
            stateSummary: '这处发现的阶段记录已完成。',
            recentActionSummary: event.detail || event.title || event.stage || runtimeNarrative,
            progressSummary: null,
            ruleLabel: '服务端阶段事件',
            type: 'annotate' as const,
            status,
            actionCount: 1,
          };
        });
    }

    if (visibleActions.length > 0) {
      const latestActions = [...visibleActions].reverse();
      const rowsByFindingId = new Map<string, TimelineRow>();

      latestActions.forEach((action) => {
        const page = pages[action.locator.page - 1] || fallbackPage;
        const summary = summarizeAction(page, action);
        const existing = rowsByFindingId.get(action.findingId);
        const nextStatus: TimelineRow['status'] = activeActionSet.has(action.id)
          ? 'live'
          : action.type === 'annotate'
          ? 'needs-review'
          : 'done';

        if (!existing) {
          const findingTitle = getFindingCardTitle(action.findingLabel);
          const progressSummary = action.type === 'annotate'
            ? '这处发现已保留复核点，下一步人工确认时会重点呈现。'
            : null;
          rowsByFindingId.set(action.findingId, {
            id: action.findingId,
            actionId: action.id,
            findingId: action.findingId,
            findingLabel: action.findingLabel,
            findingTitle,
            timestamp: formatTimestamp(Math.min(simulatedElapsedMs, action.timestamp)),
            chapter: summary.chapter,
            page: action.locator.page,
            paragraphIndex: action.locator.paragraphIndex,
            stateLabel: nextStatus === 'live' ? '正在修复' : nextStatus === 'needs-review' ? '保留复核' : '已写回修复稿',
            stateSummary: nextStatus === 'live'
              ? '系统正在围绕这处发现写回版式修复。'
              : nextStatus === 'needs-review'
              ? '这处发现已定位完成，人工确认页会请你重点过目。'
              : '这处发现已写入修复稿，等待你在确认页统一过目。',
            recentActionSummary: `${summary.before}；${summary.after}`,
            progressSummary,
            ruleLabel: summary.ruleLabel,
            type: summary.type,
            status: nextStatus,
            actionCount: 1,
          });
          return;
        }

        rowsByFindingId.set(action.findingId, {
          ...existing,
          status: existing.status === 'live' || nextStatus === 'live'
            ? 'live'
            : existing.status === 'needs-review' || nextStatus === 'needs-review'
            ? 'needs-review'
            : 'done',
          actionCount: existing.actionCount + 1,
          stateLabel: existing.status === 'live' || nextStatus === 'live'
            ? '正在修复'
            : existing.status === 'needs-review' || nextStatus === 'needs-review'
            ? '保留复核'
            : '已写回修复稿',
          stateSummary: existing.status === 'live' || nextStatus === 'live'
            ? '系统正在围绕这处发现写回版式修复。'
            : existing.status === 'needs-review' || nextStatus === 'needs-review'
            ? '这处发现已定位完成，人工确认页会请你重点过目。'
            : '这处发现已写入修复稿，等待你在确认页统一过目。',
          recentActionSummary: `${summary.before}；${summary.after}`,
          progressSummary: existing.actionCount + 1 > 1
            ? `已围绕这处发现写回 ${existing.actionCount + 1} 个修复动作，正在把纸面证据和版式一起收口。`
            : existing.progressSummary,
        });
      });

      return Array.from(rowsByFindingId.values()).slice(0, 12);
    }

    const artifactRows = fixArtifacts
      .slice(-4)
      .reverse()
      .map((artifact, index) => {
        const status: TimelineRow['status'] = index === 0 ? 'live' : 'done';
        return {
          id: `artifact-${artifact.id}`,
          actionId: `artifact-${artifact.id}`,
          findingId: artifact.finding_id || artifact.related_finding_ids?.[0] || `artifact-finding-${artifact.id}`,
          findingLabel: artifact.title || artifact.chapter || '修复结果',
          findingTitle: artifact.title || artifact.chapter || '修复结果',
          timestamp: formatTimestamp(Math.max(0, simulatedElapsedMs - (index * 1400))),
          chapter: artifact.chapter || visualRuntimeStore.currentChapter,
          page: visualRuntimeStore.currentPage,
          paragraphIndex: index,
          stateLabel: status === 'live' ? '正在整理修复结果' : '已写回修复稿',
          stateSummary: status === 'live' ? '系统正在将修复结果写回到当前稿件。' : '这处发现的修复结果已回传到当前工作台。',
          recentActionSummary: artifact.summary || artifact.sourceSnippet || artifact.title || '正在准备修复动作',
          progressSummary: null,
          ruleLabel: getArtifactRuleLabel(artifact),
          type: 'annotate' as const,
          status,
          actionCount: 1,
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
          actionId: `event-${event.id}`,
          findingId: event.finding_id || event.related_finding_ids?.[0] || `event-finding-${event.id}`,
          findingLabel: event.finding_id || event.related_finding_ids?.[0]
            ? `服务端发现 · ${event.title || event.stage}`
            : event.stage ? `服务端发现 · ${event.stage}` : '服务端发现 · 阶段推进',
          findingTitle: event.title || event.stage || '阶段推进',
          timestamp: formatTimestamp(Math.max(0, simulatedElapsedMs - (index * 1200))),
          chapter: visualRuntimeStore.currentChapter,
          page: visualRuntimeStore.currentPage,
          paragraphIndex: index,
          stateLabel: status === 'live' ? '正在写回' : '阶段已完成',
          stateSummary: status === 'live' ? '服务端正在推进这处发现的写回阶段。' : '这处发现的阶段记录已完成。',
          recentActionSummary: event.detail || event.title || event.stage || runtimeNarrative,
          progressSummary: null,
          ruleLabel: '服务端阶段事件',
          type: 'annotate' as const,
          status,
          actionCount: 1,
        };
      });
  }, [activeActionSet, fallbackPage, fixArtifacts, fixEvents, pages, runtimeNarrative, visibleActions, visualRuntimeStore]);

  return { timelineRows };
}
