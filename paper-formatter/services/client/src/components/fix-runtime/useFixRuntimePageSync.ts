import { useEffect, useLayoutEffect } from 'react';
import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from 'react';
import type { FixAction } from '../../mock/fixActions';
import type { PaperPage } from '../../mock/paperContent';
import type { PenCursorState } from '../PenCursor';
import type { AnnotationLayout, PageTextBlock, RecentActionMeta, TimelineRow } from './types';
import { MM_TO_PX, clamp, getCharKey } from './utils';

interface Params {
  runtimeStatus: 'running' | 'paused' | 'completed';
  fixActionsLength: number;
  targetAppliedCount: number;
  appliedCount: number;
  activeActionIdsLength: number;
  isPageFlipping: boolean;
  desiredPageIndex: number;
  displayedPageIndex: number;
  currentPaperPage: PaperPage;
  pagesLength: number;
  recentActionMeta: Record<string, RecentActionMeta>;
  annotations: FixAction[];
  pageTextBlockMap: Map<number, PageTextBlock>;
  charRefs: MutableRefObject<Record<string, HTMLSpanElement | null>>;
  livePageRef: RefObject<HTMLDivElement | null>;
  setAppliedCount: Dispatch<SetStateAction<number>>;
  setActiveActionIds: Dispatch<SetStateAction<string[]>>;
  setPenState: Dispatch<SetStateAction<PenCursorState>>;
  setPreviousPage: Dispatch<SetStateAction<PaperPage | null>>;
  setIsPageFlipping: Dispatch<SetStateAction<boolean>>;
  setDisplayedPageIndex: Dispatch<SetStateAction<number>>;
  setAnnotationLayouts: Dispatch<SetStateAction<Record<string, AnnotationLayout>>>;
}

export function useFixRuntimePageSync({
  runtimeStatus,
  fixActionsLength,
  targetAppliedCount,
  appliedCount,
  activeActionIdsLength,
  isPageFlipping,
  desiredPageIndex,
  displayedPageIndex,
  currentPaperPage,
  pagesLength,
  recentActionMeta,
  annotations,
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
}: Params) {
  useEffect(() => {
    if (runtimeStatus === 'completed') {
      setAppliedCount(fixActionsLength);
      setActiveActionIds([]);
      setPenState('idle');
      return;
    }
    setAppliedCount(prev => Math.min(prev, fixActionsLength));
  }, [fixActionsLength, runtimeStatus, setActiveActionIds, setAppliedCount, setPenState]);

  useEffect(() => {
    if (runtimeStatus !== 'running') return;
    if (activeActionIdsLength > 0 || isPageFlipping) return;
    if (targetAppliedCount <= appliedCount) return;
    if (targetAppliedCount - appliedCount <= 1) return;
    setAppliedCount(targetAppliedCount);
  }, [
    activeActionIdsLength,
    appliedCount,
    isPageFlipping,
    runtimeStatus,
    targetAppliedCount,
    setAppliedCount,
  ]);

  useEffect(() => {
    if (desiredPageIndex === displayedPageIndex || isPageFlipping || pagesLength === 0) return;
    const latestActionOnCurrentPage = Object.values(recentActionMeta)
      .filter(item => item.page === currentPaperPage.pageNumber)
      .reduce((latest, item) => Math.max(latest, item.completedAt), 0);
    const holdRemaining = latestActionOnCurrentPage > 0
      ? Math.max(0, 1500 - (Date.now() - latestActionOnCurrentPage))
      : 0;

    const startFlip = () => {
      setPenState('lifting');
      setPreviousPage(currentPaperPage);
      setIsPageFlipping(true);
      return window.setTimeout(() => {
        setDisplayedPageIndex(desiredPageIndex);
        setPreviousPage(null);
        setIsPageFlipping(false);
      }, 500);
    };

    if (holdRemaining > 0) {
      let completeFlip: number | null = null;
      const waitTimer = window.setTimeout(() => {
        completeFlip = startFlip();
      }, holdRemaining);
      return () => {
        window.clearTimeout(waitTimer);
        if (completeFlip) window.clearTimeout(completeFlip);
      };
    }

    const timer = startFlip();
    return () => window.clearTimeout(timer);
  }, [
    currentPaperPage,
    desiredPageIndex,
    displayedPageIndex,
    isPageFlipping,
    pagesLength,
    recentActionMeta,
    setDisplayedPageIndex,
    setIsPageFlipping,
    setPenState,
    setPreviousPage,
  ]);

  useLayoutEffect(() => {
    const pageNode = livePageRef.current;
    if (!pageNode) return;
    const pageRect = pageNode.getBoundingClientRect();
    const nextLayouts: Record<string, AnnotationLayout> = {};
    annotations.forEach((action, index) => {
      const blockMeta = pageTextBlockMap.get(action.locator.paragraphIndex);
      if (!blockMeta) return;
      const blockLength = Array.from(blockMeta.block.content).length;
      const targetOffset = clamp(action.locator.charOffset, 0, Math.max(blockLength - 1, 0));
      const charKey = getCharKey(currentPaperPage.pageNumber, action.locator.paragraphIndex, targetOffset);
      const targetNode = charRefs.current[charKey];
      if (!targetNode) return;
      const rect = targetNode.getBoundingClientRect();
      const noteWidth = Math.min(188, pageRect.width * 0.24);
      const left = pageRect.width - (12 * MM_TO_PX) - noteWidth;
      const targetX = rect.left - pageRect.left + rect.width * 0.5;
      const top = clamp(rect.top - pageRect.top - 8 + (index * 6), 28, pageRect.height - 88);
      nextLayouts[action.id] = {
        top,
        left,
        noteWidth,
        leaderWidth: Math.max(30, left - targetX - 12),
      };
    });
    setAnnotationLayouts(nextLayouts);
  }, [
    annotations,
    charRefs,
    currentPaperPage.pageNumber,
    displayedPageIndex,
    livePageRef,
    pageTextBlockMap,
    setAnnotationLayouts,
  ]);
}

export function createJumpToActionHandler(
  pagesLength: number,
  setDisplayedPageIndex: Dispatch<SetStateAction<number>>,
) {
  return function handleJumpToAction(row: TimelineRow) {
    if (row.page < 1 || row.page > pagesLength) return;
    setDisplayedPageIndex(row.page - 1);
  };
}
