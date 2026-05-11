import { useEffect, useLayoutEffect } from 'react';
import type {
  Dispatch,
  MutableRefObject,
  RefObject,
  SetStateAction,
  UIEvent,
} from 'react';
import type { FixAction } from '../../mock/fixActions';
import type { PaperPage } from '../../mock/paperContent';
import type { PenCursorState } from '../PenCursor';
import type {
  AnnotationLayout,
  FixRuntimeStore,
  PageTextBlock,
  TimelineRow,
} from './types';
import {
  clamp,
  getCharKey,
  getPenPositionFromRect,
} from './utils';

interface Params {
  visualRuntimeStore: FixRuntimeStore;
  currentPaperPage: PaperPage;
  pageTextBlocks: PageTextBlock[];
  pageTextBlockMap: Map<number, PageTextBlock>;
  activeAction: FixAction | null;
  annotationLayouts: Record<string, AnnotationLayout>;
  charRefs: MutableRefObject<Record<string, HTMLSpanElement | null>>;
  livePageRef: RefObject<HTMLDivElement | null>;
  rightFeedRef: RefObject<HTMLDivElement | null>;
  ignoreScrollRef: MutableRefObject<boolean>;
  prevStatusRef: MutableRefObject<FixRuntimeStore['status']>;
  pauseHintHideTimerRef: MutableRefObject<number | null>;
  pauseHintShowTimerRef: MutableRefObject<number | null>;
  timelineRows: TimelineRow[];
  isPageFlipping: boolean;
  introPlayed: boolean;
  introRunning: boolean;
  manualAutoScrollLocked: boolean;
  onPauseToggle: () => void;
  setPenState: Dispatch<SetStateAction<PenCursorState>>;
  setPenPosition: Dispatch<SetStateAction<{ x: number; y: number }>>;
  setPenTransitionMs: Dispatch<SetStateAction<number>>;
  setPaperBow: Dispatch<SetStateAction<boolean>>;
  setDiffPulse: Dispatch<SetStateAction<boolean>>;
  setShowPauseHint: Dispatch<SetStateAction<boolean>>;
  setIntroPlayed: Dispatch<SetStateAction<boolean>>;
  setIntroRunning: Dispatch<SetStateAction<boolean>>;
  setManualAutoScrollLocked: Dispatch<SetStateAction<boolean>>;
}

export function useFixRuntimeAttentionEffects({
  visualRuntimeStore,
  currentPaperPage,
  pageTextBlocks,
  pageTextBlockMap,
  activeAction,
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
}: Params) {
  useLayoutEffect(() => {
    if (introRunning) return;
    if (visualRuntimeStore.status === 'paused') {
      setPenState('idle');
      return;
    }
    if (isPageFlipping) {
      setPenState('lifting');
      return;
    }

    if (activeAction) {
      if (activeAction.type === 'annotate') {
        const layout = annotationLayouts[activeAction.id];
        const pageRect = livePageRef.current?.getBoundingClientRect() || null;
        if (layout && pageRect) {
          setPenPosition({
            x: pageRect.left + layout.left - 14,
            y: pageRect.top + layout.top + 6,
          });
          setPenState('writing');
          return;
        }
      }

      const blockMeta = pageTextBlockMap.get(activeAction.locator.paragraphIndex);
      if (blockMeta) {
        const blockLength = Array.from(blockMeta.block.content).length;
        const targetOffset = clamp(activeAction.locator.charOffset, 0, Math.max(blockLength - 1, 0));
        const charKey = getCharKey(currentPaperPage.pageNumber, activeAction.locator.paragraphIndex, targetOffset);
        const rect = charRefs.current[charKey]?.getBoundingClientRect() || null;
        if (rect) {
          setPenPosition(getPenPositionFromRect(rect));
          setPenState('writing');
          return;
        }
      }
    }

    const firstBlock = pageTextBlocks[0];
    if (!firstBlock) {
      setPenState('idle');
      return;
    }
    const firstKey = getCharKey(currentPaperPage.pageNumber, firstBlock.paragraphIndex, 0);
    const rect = charRefs.current[firstKey]?.getBoundingClientRect() || null;
    if (rect) {
      setPenPosition(getPenPositionFromRect(rect));
    }
    setPenState('idle');
  }, [
    activeAction,
    annotationLayouts,
    charRefs,
    currentPaperPage.pageNumber,
    introRunning,
    isPageFlipping,
    livePageRef,
    pageTextBlocks,
    pageTextBlockMap,
    setPenPosition,
    setPenState,
    visualRuntimeStore.status,
  ]);

  useEffect(() => {
    if (introPlayed || introRunning) return;
    const firstBlock = pageTextBlocks[0];
    if (!firstBlock) return;
    const firstKey = getCharKey(currentPaperPage.pageNumber, firstBlock.paragraphIndex, 0);
    const rect = charRefs.current[firstKey]?.getBoundingClientRect() || null;
    const pageRect = livePageRef.current?.getBoundingClientRect() || null;
    if (!rect || !pageRect) return;

    setIntroRunning(true);
    setPenTransitionMs(1200);
    setPenState('lifting');
    setPenPosition({
      x: pageRect.left - 72,
      y: pageRect.bottom + 52,
    });
    const raf = window.requestAnimationFrame(() => {
      setPenPosition(getPenPositionFromRect(rect));
      setPenState('writing');
    });
    const timer = window.setTimeout(() => {
      setPenTransitionMs(visualRuntimeStore.speed === 4 ? 40 : 90);
      setIntroRunning(false);
      setIntroPlayed(true);
    }, 1200);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [
    charRefs,
    currentPaperPage.pageNumber,
    introPlayed,
    introRunning,
    livePageRef,
    pageTextBlocks,
    setIntroPlayed,
    setIntroRunning,
    setPenPosition,
    setPenState,
    setPenTransitionMs,
    visualRuntimeStore.speed,
  ]);

  useEffect(() => {
    if (prevStatusRef.current !== 'completed' && visualRuntimeStore.status === 'completed') {
      const pageRect = livePageRef.current?.getBoundingClientRect();
      if (pageRect) {
        setPenTransitionMs(800);
        setPenState('lifting');
        setPenPosition({
          x: pageRect.right + 54,
          y: pageRect.top - 64,
        });
        setPaperBow(true);
        const bowTimer = window.setTimeout(() => setPaperBow(false), 420);
        const pulseTimer = window.setTimeout(() => {
          setDiffPulse(true);
          window.setTimeout(() => setDiffPulse(false), 1200);
        }, 1500);
        prevStatusRef.current = visualRuntimeStore.status;
        return () => {
          window.clearTimeout(bowTimer);
          window.clearTimeout(pulseTimer);
        };
      }
    } else if (visualRuntimeStore.status !== 'completed') {
      setPenTransitionMs(visualRuntimeStore.speed === 4 ? 40 : 90);
      setPaperBow(false);
      setDiffPulse(false);
    }
    prevStatusRef.current = visualRuntimeStore.status;
  }, [
    livePageRef,
    prevStatusRef,
    setDiffPulse,
    setPaperBow,
    setPenPosition,
    setPenState,
    setPenTransitionMs,
    visualRuntimeStore.speed,
    visualRuntimeStore.status,
  ]);

  useEffect(() => {
    if (visualRuntimeStore.status === 'completed') {
      setShowPauseHint(false);
      if (pauseHintShowTimerRef.current) window.clearTimeout(pauseHintShowTimerRef.current);
      if (pauseHintHideTimerRef.current) window.clearTimeout(pauseHintHideTimerRef.current);
      return;
    }

    const scheduleHint = () => {
      if (pauseHintShowTimerRef.current) window.clearTimeout(pauseHintShowTimerRef.current);
      if (pauseHintHideTimerRef.current) window.clearTimeout(pauseHintHideTimerRef.current);
      pauseHintShowTimerRef.current = window.setTimeout(() => {
        setShowPauseHint(true);
        pauseHintHideTimerRef.current = window.setTimeout(() => {
          setShowPauseHint(false);
        }, 3000);
      }, 8000);
    };

    const handleUserInput = () => {
      setShowPauseHint(false);
      scheduleHint();
    };
    const handleKeyInput = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault();
        onPauseToggle();
        return;
      }
      handleUserInput();
    };

    if (visualRuntimeStore.status === 'running') {
      scheduleHint();
      window.addEventListener('pointermove', handleUserInput, { passive: true });
      window.addEventListener('wheel', handleUserInput, { passive: true });
    }
    window.addEventListener('keydown', handleKeyInput);

    return () => {
      window.removeEventListener('pointermove', handleUserInput);
      window.removeEventListener('keydown', handleKeyInput);
      window.removeEventListener('wheel', handleUserInput);
      if (pauseHintShowTimerRef.current) window.clearTimeout(pauseHintShowTimerRef.current);
      if (pauseHintHideTimerRef.current) window.clearTimeout(pauseHintHideTimerRef.current);
    };
  }, [
    onPauseToggle,
    pauseHintHideTimerRef,
    pauseHintShowTimerRef,
    setShowPauseHint,
    visualRuntimeStore.status,
  ]);

  useEffect(() => {
    if (manualAutoScrollLocked) return;
    const node = rightFeedRef.current;
    if (!node) return;
    ignoreScrollRef.current = true;
    node.scrollTo({ top: 0, behavior: 'smooth' });
    const timer = window.setTimeout(() => {
      ignoreScrollRef.current = false;
    }, 260);
    return () => window.clearTimeout(timer);
  }, [ignoreScrollRef, manualAutoScrollLocked, rightFeedRef, timelineRows]);

  function handleRightFeedScroll(event: UIEvent<HTMLDivElement>) {
    if (ignoreScrollRef.current) return;
    const node = event.currentTarget;
    if (node.scrollTop > 24) {
      setManualAutoScrollLocked(true);
      return;
    }
    setManualAutoScrollLocked(false);
  }

  return { handleRightFeedScroll };
}
