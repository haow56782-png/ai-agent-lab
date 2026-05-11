import React from 'react';
import { Btn } from '../../components/Common';
import type { DiffCopyShape } from './diffCopy';
import type { ReviewItem } from './types';

interface Props {
  copy: DiffCopyShape;
  t: (key: keyof DiffCopyShape, vars?: Record<string, string | number>) => string;
  diffLoadState: 'loading' | 'ready' | 'error';
  retryLoadDiff: () => void;
  reviewItems: ReviewItem[];
  visibleReviewItems: ReviewItem[];
  visibleReviewRangeStart: number;
  shouldVirtualizeReviewList: boolean;
  reviewTopSpacer: number;
  reviewBottomSpacer: number;
  reviewListRef: React.RefObject<HTMLDivElement | null>;
  reviewCardRefs: React.MutableRefObject<Record<string, HTMLElement | null>>;
  setReviewListScrollTop: (value: number) => void;
  activeReview: ReviewItem | null;
  currentReviewIndex: number;
  reviewPointCount: number;
  visibleReviewPoints: number[];
  processedCount: number;
  ruleActions: Map<string, 'accepted' | 'ignored'>;
  scheduleHoverFocus: (item: ReviewItem) => void;
  cancelHoverFocus: () => void;
  setUserInteractedAfterComplete: (value: boolean) => void;
  setPreviewRuleId: (value: string | null) => void;
  setActiveRuleId: (value: string | null) => void;
  selectPage: (page: number) => void;
  handleAccept: (item: ReviewItem) => void;
  handleIgnore: (item: ReviewItem) => void;
  handleSelfEdit: (item: ReviewItem) => void;
}

export const DiffReviewPanel: React.FC<Props> = ({
  copy,
  t,
  diffLoadState,
  retryLoadDiff,
  reviewItems,
  visibleReviewItems,
  visibleReviewRangeStart,
  shouldVirtualizeReviewList,
  reviewTopSpacer,
  reviewBottomSpacer,
  reviewListRef,
  reviewCardRefs,
  setReviewListScrollTop,
  activeReview,
  currentReviewIndex,
  reviewPointCount,
  visibleReviewPoints,
  processedCount,
  ruleActions,
  scheduleHoverFocus,
  cancelHoverFocus,
  setUserInteractedAfterComplete,
  setPreviewRuleId,
  setActiveRuleId,
  selectPage,
  handleAccept,
  handleIgnore,
  handleSelfEdit,
}) => (
  <aside
    data-testid="diff-review-panel"
    style={{
      width: 400,
      display: 'flex',
      justifyContent: 'center',
      background: 'transparent',
    }}
  >
    <div
      style={{
        position: 'sticky',
        top: 200,
        width: 400,
        background: 'var(--paper)',
        borderLeft: '1px solid var(--rule-line)',
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        maxHeight: 'calc(100vh - 232px)',
      }}
    >
      <div
        style={{
          minHeight: 80,
          paddingBottom: 16,
          borderBottom: '1px solid var(--rule-line)',
        }}
      >
        <div
          style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--ink-tertiary)',
            marginBottom: 10,
          }}
        >
          {copy.review_now}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 8,
            marginBottom: 10,
          }}
        >
          <span
            style={{
              fontSize: 'var(--text-2xl)',
              color: 'var(--ink-primary)',
              fontWeight: 700,
            }}
          >
            {t('review_item_current', {
              current: Math.min(currentReviewIndex + 1, Math.max(reviewItems.length, 1)),
            })}
          </span>
          <span
            style={{
              fontSize: 'var(--text-md)',
              color: 'var(--ink-secondary)',
            }}
          >
            {t('review_item_total', { total: Math.max(reviewItems.length, 1) })}
          </span>
        </div>
        <div
          role="progressbar"
          aria-label={copy.progress_label}
          aria-valuemin={0}
          aria-valuemax={Math.max(reviewItems.length, 1)}
          aria-valuenow={Math.min(currentReviewIndex + 1, Math.max(reviewItems.length, 1))}
          aria-valuetext={t('review_item_of_total', {
            current: Math.min(currentReviewIndex + 1, Math.max(reviewItems.length, 1)),
            total: Math.max(reviewItems.length, 1),
          })}
          style={{ display: 'flex', gap: 8 }}
        >
          {visibleReviewPoints.map((dotIndex) => {
            const isCurrent = dotIndex === Math.min(currentReviewIndex, reviewPointCount - 1);
            const isDone = dotIndex < processedCount;
            return (
              <span
                key={`review-point-${dotIndex}`}
                className={`diff-review-point${isCurrent ? ' is-current' : ''}${isDone ? ' is-done' : ''}`}
              />
            );
          })}
        </div>
      </div>

      <div
        className="diff-review-list"
        ref={reviewListRef}
        onScroll={(event) => setReviewListScrollTop(event.currentTarget.scrollTop)}
        style={{
          flex: 1,
          overflowY: 'auto',
          paddingTop: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {diffLoadState === 'loading' ? (
          Array.from({ length: 3 }, (_, index) => (
            <div key={`skeleton-${index}`} className="diff-review-card diff-review-card-skeleton" aria-hidden="true">
              <div className="diff-review-skeleton-line diff-review-skeleton-short" />
              <div className="diff-review-skeleton-divider" />
              <div className="diff-review-skeleton-line diff-review-skeleton-main" />
              <div className="diff-review-skeleton-line diff-review-skeleton-body" />
              <div className="diff-review-skeleton-line diff-review-skeleton-body" />
              <div className="diff-review-skeleton-actions">
                <span className="diff-review-skeleton-chip" />
                <span className="diff-review-skeleton-chip" />
                <span className="diff-review-skeleton-chip" />
              </div>
            </div>
          ))
        ) : diffLoadState === 'error' ? (
          <div className="diff-review-panel-state">
            <div className="diff-review-panel-error">{copy.review_error}</div>
            <Btn kind="ghost" size="md" onClick={retryLoadDiff}>
              {copy.review_retry}
            </Btn>
          </div>
        ) : reviewItems.length === 0 ? (
          <div className="diff-review-panel-state">
            <div className="diff-review-empty-pen" />
            <div className="diff-review-empty-title">{copy.review_empty_title}</div>
            <div className="diff-review-empty-body">{copy.review_empty_body}</div>
          </div>
        ) : (
          <>
            {reviewTopSpacer > 0 && <div aria-hidden="true" style={{ height: reviewTopSpacer }} />}
            {visibleReviewItems.map((item, visibleIndex) => {
              const index = shouldVirtualizeReviewList ? visibleReviewRangeStart + visibleIndex : visibleIndex;
              const action = ruleActions.get(item.label);
              const isActive = item.id === activeReview?.id;
              const cardStateClass = action === 'accepted'
                ? ' is-accepted'
                : action === 'ignored'
                ? ' is-rejected'
                : isActive
                ? ' is-focus'
                : '';

              return (
                <article
                  key={item.findingId}
                  data-testid={`diff-review-card-${item.findingId}`}
                  role="article"
                  tabIndex={0}
                  ref={(node) => {
                    reviewCardRefs.current[item.findingId] = node;
                  }}
                  aria-label={t('sr_review_suggestion', {
                    page: t('page_prefix', { page: item.page }),
                    chapter: item.chapter,
                    target: item.target,
                  })}
                  className={`diff-review-card${cardStateClass}`}
                  onFocus={() => {
                    cancelHoverFocus();
                    setActiveRuleId(item.findingId);
                  }}
                  onMouseEnter={() => scheduleHoverFocus(item)}
                  onMouseLeave={cancelHoverFocus}
                  onClick={() => {
                    cancelHoverFocus();
                    setUserInteractedAfterComplete(true);
                    setPreviewRuleId(null);
                    setActiveRuleId(item.findingId);
                    selectPage(item.page);
                  }}
                  onKeyDown={(event) => {
                    if (event.metaKey || event.ctrlKey) return;
                    if (event.key === 'Tab') {
                      const currentIndex = reviewItems.findIndex((reviewItem) => reviewItem.findingId === item.findingId);
                      if (!event.shiftKey && currentIndex === reviewItems.length - 1) {
                        event.preventDefault();
                        reviewCardRefs.current[reviewItems[0]?.findingId || '']?.focus();
                      }
                      if (event.shiftKey && currentIndex === 0) {
                        event.preventDefault();
                        reviewCardRefs.current[reviewItems[reviewItems.length - 1]?.findingId || '']?.focus();
                      }
                      return;
                    }
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      cancelHoverFocus();
                      setUserInteractedAfterComplete(true);
                      setPreviewRuleId(null);
                      setActiveRuleId(item.findingId);
                      handleAccept(item);
                      return;
                    }
                    if (event.key === 'Escape') {
                      event.preventDefault();
                      cancelHoverFocus();
                      setUserInteractedAfterComplete(true);
                      setPreviewRuleId(null);
                      setActiveRuleId(item.findingId);
                      handleIgnore(item);
                      return;
                    }
                    if (event.key === ' ') {
                      event.preventDefault();
                      cancelHoverFocus();
                      setUserInteractedAfterComplete(true);
                      setPreviewRuleId(null);
                      setActiveRuleId(item.findingId);
                      selectPage(item.page);
                    }
                  }}
                >
                  <div className="diff-review-card-top">
                    <div className="diff-review-card-meta">
                      {t('page_meta', { page: item.page, chapter: item.chapter })}
                    </div>
                    <span className="diff-review-card-index">
                      {action === 'accepted' ? '✓' : action === 'ignored' ? '✕' : index + 1}
                    </span>
                  </div>

                  <div className="diff-review-card-divider" />

                  <div className="diff-review-card-main">
                    {action === 'accepted' && <span className="diff-review-card-check">✓</span>}
                    <span className="diff-review-card-main-text">
                      {item.current} → {item.target}
                    </span>
                  </div>

                  <div className="diff-review-card-sub">
                    {item.target}
                  </div>

                  <div className="diff-review-card-divider" />

                  <div
                    className="diff-review-card-actions"
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <Btn
                      title={copy.accept}
                      kind={action === 'accepted' ? 'brand' : 'ghost'}
                      size="sm"
                      onClick={() => handleAccept(item)}
                      style={{ minWidth: 72 }}
                    >
                      {copy.accept}
                    </Btn>
                    <Btn
                      title={copy.reject}
                      kind="ghost"
                      size="sm"
                      onClick={() => handleIgnore(item)}
                      style={{
                        minWidth: 72,
                        opacity: action === 'accepted' ? 0.45 : 1,
                        borderStyle: action === 'ignored' ? 'dashed' : 'solid',
                      }}
                    >
                      {copy.reject}
                    </Btn>
                    <button
                      type="button"
                      className="diff-review-card-self-edit"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleSelfEdit(item);
                      }}
                    >
                      {copy.self_edit} →
                    </button>
                  </div>
                </article>
              );
            })}
            {reviewBottomSpacer > 0 && <div aria-hidden="true" style={{ height: reviewBottomSpacer }} />}
          </>
        )}
      </div>
    </div>
  </aside>
);
