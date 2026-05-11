import { useMemo } from 'react';
import {
  PAGE_NAV_ITEM_HEIGHT,
  PAGE_NAV_MAX_VIEWPORT_HEIGHT,
  PAGE_NAV_OVERSCAN,
  PAGE_OVERSCAN,
  REVIEW_CARD_ESTIMATE,
  REVIEW_OVERSCAN,
} from './types';

interface Params {
  pageList: number[];
  pageNavScrollTop: number;
  paperScrollTop: number;
  paperViewportHeight: number;
  paperViewportWidth: number;
  reviewItemsLength: number;
  reviewListScrollTop: number;
  reviewListViewportHeight?: number;
}

export function useDiffVirtualizer({
  pageList,
  pageNavScrollTop,
  paperScrollTop,
  paperViewportHeight,
  paperViewportWidth,
  reviewItemsLength,
  reviewListScrollTop,
  reviewListViewportHeight = 560,
}: Params) {
  const paperPageWidth = Math.min(720, Math.max(320, paperViewportWidth));
  const paperPageHeight = paperPageWidth * 297 / 210;
  const paperPagePitch = paperPageHeight + 24;

  const shouldVirtualizePageNav = pageList.length > 50;
  const shouldVirtualizePaperPages = pageList.length > 50;
  const shouldVirtualizeReviewList = reviewItemsLength > 100;

  const pageNavViewportHeight = Math.min(pageList.length * PAGE_NAV_ITEM_HEIGHT, PAGE_NAV_MAX_VIEWPORT_HEIGHT);
  const pageNavTotalHeight = pageList.length * PAGE_NAV_ITEM_HEIGHT;

  const visiblePageRange = useMemo(() => {
    if (!shouldVirtualizePageNav) {
      return { start: 0, end: pageList.length };
    }

    const start = Math.max(0, Math.floor(pageNavScrollTop / PAGE_NAV_ITEM_HEIGHT) - PAGE_NAV_OVERSCAN);
    const visibleCount = Math.ceil(pageNavViewportHeight / PAGE_NAV_ITEM_HEIGHT) + PAGE_NAV_OVERSCAN * 2;
    return {
      start,
      end: Math.min(pageList.length, start + visibleCount),
    };
  }, [pageList.length, pageNavScrollTop, pageNavViewportHeight, shouldVirtualizePageNav]);

  const visiblePaperRange = useMemo(() => {
    if (!shouldVirtualizePaperPages) return { start: 0, end: pageList.length };
    const start = Math.max(0, Math.floor(paperScrollTop / paperPagePitch) - PAGE_OVERSCAN);
    const visibleCount = Math.ceil(paperViewportHeight / paperPagePitch) + PAGE_OVERSCAN * 2;
    return {
      start,
      end: Math.min(pageList.length, start + visibleCount),
    };
  }, [pageList.length, paperPagePitch, paperScrollTop, paperViewportHeight, shouldVirtualizePaperPages]);

  const visibleReviewRange = useMemo(() => {
    if (!shouldVirtualizeReviewList) return { start: 0, end: reviewItemsLength };
    const start = Math.max(0, Math.floor(reviewListScrollTop / REVIEW_CARD_ESTIMATE) - REVIEW_OVERSCAN);
    const visibleCount = Math.ceil(reviewListViewportHeight / REVIEW_CARD_ESTIMATE) + REVIEW_OVERSCAN * 2;
    return {
      start,
      end: Math.min(reviewItemsLength, start + visibleCount),
    };
  }, [reviewItemsLength, reviewListScrollTop, reviewListViewportHeight, shouldVirtualizeReviewList]);

  return {
    paperPageWidth,
    paperPageHeight,
    paperPagePitch,
    shouldVirtualizePageNav,
    shouldVirtualizePaperPages,
    shouldVirtualizeReviewList,
    pageNavViewportHeight,
    pageNavTotalHeight,
    visiblePageRange,
    visiblePageNumbers: shouldVirtualizePageNav
      ? pageList.slice(visiblePageRange.start, visiblePageRange.end)
      : pageList,
    visiblePaperRange,
    visiblePaperPages: shouldVirtualizePaperPages
      ? pageList.slice(visiblePaperRange.start, visiblePaperRange.end)
      : pageList,
    paperTopSpacer: visiblePaperRange.start * paperPagePitch,
    paperBottomSpacer: Math.max(0, (pageList.length - visiblePaperRange.end) * paperPagePitch),
    visibleReviewRange,
    reviewTopSpacer: visibleReviewRange.start * REVIEW_CARD_ESTIMATE,
    reviewBottomSpacer: Math.max(0, (reviewItemsLength - visibleReviewRange.end) * REVIEW_CARD_ESTIMATE),
  };
}
