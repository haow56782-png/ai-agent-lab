// IntersectionObserver wrapper for canvas finding anchors.
// It observes actual anchor nodes instead of listening to scroll events.
// The visible finding with the highest intersectionRatio becomes focus.
// rAF batching keeps rapid canvas scrolls from flickering focus state.
import { useCallback, useEffect, useRef } from 'react';
import { reviewActions, useReviewStore } from '../stores/reviewStore';

interface Options {
  rootRef: React.RefObject<HTMLElement | null>;
}

export function useFindingObserver({ rootRef }: Options) {
  const scrollSource = useReviewStore((state) => state.scrollSource);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const ratioMapRef = useRef(new Map<string, number>());
  const nodeMapRef = useRef(new Map<string, Element>());
  const rafRef = useRef<number | null>(null);
  const deferredFlushRef = useRef<number | null>(null);
  const sourceRef = useRef(scrollSource);

  sourceRef.current = scrollSource;

  const flushFocus = useCallback(() => {
    rafRef.current = null;
    if (sourceRef.current && sourceRef.current !== 'canvas') {
      if (deferredFlushRef.current !== null) window.clearTimeout(deferredFlushRef.current);
      deferredFlushRef.current = window.setTimeout(() => {
        deferredFlushRef.current = null;
        flushFocus();
      }, 180);
      return;
    }

    let bestId: string | null = null;
    let bestRatio = 0;
    ratioMapRef.current.forEach((ratio, id) => {
      if (ratio > bestRatio) {
        bestRatio = ratio;
        bestId = id;
      }
    });

    if (bestId && bestRatio > 0) {
      reviewActions.setFocus(bestId, 'canvas');
    }
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const id = (entry.target as HTMLElement).dataset.findingId;
        if (!id) return;
        ratioMapRef.current.set(id, entry.intersectionRatio);
      });

      if (rafRef.current !== null) return;
      rafRef.current = window.requestAnimationFrame(flushFocus);
    }, {
      root,
      threshold: [0, 0.25, 0.5, 0.75, 1],
    });

    observerRef.current = observer;
    nodeMapRef.current.forEach((node) => observer.observe(node));

    return () => {
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
      if (deferredFlushRef.current !== null) window.clearTimeout(deferredFlushRef.current);
      observer.disconnect();
      observerRef.current = null;
      ratioMapRef.current.clear();
    };
  }, [flushFocus, rootRef]);

  const registerFindingAnchor = useCallback((id: string, node: Element | null) => {
    const observer = observerRef.current;
    const previous = nodeMapRef.current.get(id);
    if (previous && observer) observer.unobserve(previous);
    if (!node) {
      nodeMapRef.current.delete(id);
      ratioMapRef.current.delete(id);
      return;
    }
    nodeMapRef.current.set(id, node);
    if (observer) observer.observe(node);
  }, []);

  return { registerFindingAnchor };
}
