import React from 'react';
import type { DiffCopyShape } from './diffCopy';
import type { PaperPage, ReviewItem } from './types';
import { A4_MARGIN_BOTTOM, A4_MARGIN_LEFT, A4_MARGIN_RIGHT, A4_MARGIN_TOP } from './types';
import { isInlineDiffAction, isMarginDiffAction, shouldShowDiffMark } from './reviewVisualState';

function renderDeleteLead(text?: string) {
  if (!text) return null;
  return (
    <span className="diff-redline-delete-text">
      <span>{text}</span>
      <svg
        className="diff-redline-delete-svg"
        viewBox="0 0 120 18"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          className="diff-redline-delete-path"
          d="M4 8 C22 6, 36 12, 56 9 S 90 6, 114 12"
        />
      </svg>
    </span>
  );
}

interface Props {
  paperViewportRef: React.RefObject<HTMLDivElement | null>;
  pageSectionRefs: React.MutableRefObject<Record<number, HTMLDivElement | null>>;
  handlePaperScroll: () => void;
  paperTopSpacer: number;
  paperBottomSpacer: number;
  paperPages: PaperPage[];
  visiblePaperPages: number[];
  paperBow: boolean;
  isAllAccepted: boolean;
  paperHeader: string;
  paperTitle: string;
  copy: DiffCopyShape;
  t: (key: keyof DiffCopyShape, vars?: Record<string, string | number>) => string;
  reviewItems: ReviewItem[];
  activeRuleId: string | null;
  emphasizedRuleId: string | null;
  ruleActions: Map<string, 'accepted' | 'ignored'>;
}

export const DiffPaperStream: React.FC<Props> = ({
  paperViewportRef,
  pageSectionRefs,
  handlePaperScroll,
  paperTopSpacer,
  paperBottomSpacer,
  paperPages,
  visiblePaperPages,
  paperBow,
  isAllAccepted,
  paperHeader,
  paperTitle,
  copy,
  t,
  reviewItems,
  activeRuleId,
  emphasizedRuleId,
  ruleActions,
}) => (
  <div
    data-testid="diff-paper-stream"
    ref={paperViewportRef}
    onScroll={handlePaperScroll}
    style={{
      flex: 1,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      padding: '32px 0 96px',
      overflow: 'auto',
      scrollBehavior: 'smooth',
      background: 'var(--bg-canvas)',
    }}
  >
    <div
      style={{
        width: '100%',
        maxWidth: 720,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        willChange: 'transform',
      }}
    >
      {paperTopSpacer > 0 && <div aria-hidden="true" style={{ height: paperTopSpacer }} />}
      {paperPages.filter((paperPage) => visiblePaperPages.includes(paperPage.pageNumber)).map((paperPage) => {
        const inlineMarkedParagraphs = new Set(
          paperPage.reviewAnchors
            .filter((anchor) => {
              const inlineItem = reviewItems.find((item) => item.findingId === anchor.findingId);
              const inlineAction = inlineItem ? ruleActions.get(inlineItem.label) : undefined;
              return shouldShowDiffMark(inlineAction) && isInlineDiffAction(anchor.diff?.action);
            })
            .map((anchor) => anchor.paragraphIndex),
        );
        const marginNotes = paperPage.reviewAnchors
          .filter((anchor) => {
            const noteItem = reviewItems.find((item) => item.findingId === anchor.findingId);
            const noteAction = noteItem ? ruleActions.get(noteItem.label) : undefined;
            return shouldShowDiffMark(noteAction)
              && isMarginDiffAction(anchor.diff?.action)
              && !inlineMarkedParagraphs.has(anchor.paragraphIndex);
          })
          .slice(0, 5);
        const overflowNoteCount = Math.max(
          0,
          paperPage.reviewAnchors.filter((anchor) => {
            const noteItem = reviewItems.find((item) => item.findingId === anchor.findingId);
            const noteAction = noteItem ? ruleActions.get(noteItem.label) : undefined;
            return shouldShowDiffMark(noteAction)
              && isMarginDiffAction(anchor.diff?.action)
              && !inlineMarkedParagraphs.has(anchor.paragraphIndex);
          }).length - marginNotes.length,
        );

        return (
          <div
            key={paperPage.pageNumber}
            data-testid={`diff-paper-page-${paperPage.pageNumber}`}
            ref={(node) => {
              pageSectionRefs.current[paperPage.pageNumber] = node;
            }}
            style={{
              position: 'relative',
              marginBottom: 24,
            }}
          >
            <article
              className={paperBow && isAllAccepted ? 'diff-paper-bow' : undefined}
              style={{
                width: '100%',
                aspectRatio: '210 / 297',
                maxWidth: 720,
                background: 'var(--paper)',
                boxShadow: 'var(--shadow-paper)',
                borderRadius: 2,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: A4_MARGIN_TOP,
                  right: A4_MARGIN_RIGHT,
                  bottom: A4_MARGIN_BOTTOM,
                  left: A4_MARGIN_LEFT,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div
                  style={{
                    textAlign: 'center',
                    color: '#999',
                    fontSize: '8pt',
                    lineHeight: 1.2,
                    marginBottom: 18,
                  }}
                >
                  {paperHeader}
                </div>

                {paperPage.pageNumber === 1 && (
                  <div
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: 22,
                      lineHeight: 1.35,
                      textAlign: 'center',
                      color: 'var(--ink-text)',
                      marginBottom: 28,
                      fontWeight: 600,
                    }}
                  >
                    {paperTitle}
                  </div>
                )}

                <div
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 'var(--text-2xl)',
                    color: 'var(--ink-text)',
                    marginBottom: 20,
                    fontWeight: 500,
                  }}
                >
                  {paperPage.pageNumber === 1 ? copy.abstract_title : paperPage.chapter}
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    fontFamily: 'var(--font-serif)',
                    fontSize: 'var(--text-lg)',
                    lineHeight: 'var(--leading-relaxed)',
                    color: 'var(--ink-text)',
                    flex: 1,
                  }}
                >
                  {paperPage.paragraphList.map((paragraph, index) => {
                    const paragraphAnchor = paperPage.reviewAnchors.find((anchor) => anchor.paragraphIndex === index);
                    const paragraphDiff = paragraphAnchor?.diff ?? null;
                    const anchorReviewItem = paragraphAnchor ? reviewItems.find((item) => item.findingId === paragraphAnchor.findingId) : undefined;
                    const actionState = anchorReviewItem ? ruleActions.get(anchorReviewItem.label) : undefined;
                    const showDiffMark = !!paragraphDiff && shouldShowDiffMark(actionState);
                    const isFormatHint = showDiffMark && paragraphDiff?.action === 'format-hint';
                    const isDelete = showDiffMark && paragraphDiff?.action === 'delete';
                    const isReplace = showDiffMark && paragraphDiff?.action === 'replace';
                    const isDimmed = !!activeRuleId && paragraphAnchor?.findingId !== activeRuleId;
                    const isPulsing = emphasizedRuleId === paragraphAnchor?.findingId;
                    const srLabel = paragraphAnchor
                      ? t('sr_review_suggestion', {
                          page: t('page_prefix', { page: paperPage.pageNumber }),
                          chapter: paperPage.chapter,
                          target: anchorReviewItem?.target || paragraphDiff?.note || '',
                        })
                      : undefined;

                    return (
                      <div
                        key={`${paperPage.pageNumber}-${index}`}
                        role={paragraphAnchor ? 'img' : undefined}
                        aria-label={srLabel}
                        className={[
                          isFormatHint ? 'diff-format-paragraph' : '',
                          isDimmed ? 'is-dimmed' : '',
                          isPulsing ? 'is-emphasis' : '',
                          actionState === 'accepted' ? 'is-accepted-mark' : '',
                        ].filter(Boolean).join(' ') || undefined}
                        style={{
                          position: 'relative',
                          padding: showDiffMark ? '10px 12px' : '0',
                          background: showDiffMark && paragraphDiff.action !== 'delete' ? 'rgba(200,56,56,.06)' : 'transparent',
                          borderRadius: showDiffMark ? 'var(--radius-sm)' : 0,
                        }}
                      >
                        {isReplace ? (
                          <>
                            <span
                              className={[
                                'diff-redline-replace',
                                isDimmed ? 'is-dimmed' : '',
                                isPulsing ? 'is-emphasis' : '',
                                actionState === 'accepted' ? 'is-accepted-mark' : '',
                              ].filter(Boolean).join(' ')}
                            >
                              {renderDeleteLead(paragraphDiff.beforeText)}
                              <span className="diff-redline-replace-note">
                                {(paragraphDiff.afterText?.length || 0) > (paragraphDiff.beforeText?.length || 0) ? '^' : '→'}
                                {paragraphDiff.afterText}
                              </span>
                            </span>
                            <span>{paragraph}</span>
                          </>
                        ) : isDelete ? (
                          <>
                            <span>{paragraph}</span>
                            {paragraphDiff?.beforeText && (
                              <span
                                className={[
                                  'diff-redline-delete-inline',
                                  isDimmed ? 'is-dimmed' : '',
                                  isPulsing ? 'is-emphasis' : '',
                                  actionState === 'accepted' ? 'is-accepted-mark' : '',
                                ].filter(Boolean).join(' ')}
                              >
                                {renderDeleteLead(paragraphDiff.beforeText)}
                              </span>
                            )}
                          </>
                        ) : (
                          <span>{paragraph}</span>
                        )}
                      </div>
                    );
                  })}

                  {paperPage.pageNumber === 1 && (
                    <>
                      <div
                        style={{
                          marginTop: 28,
                          border: '1px solid rgba(0,0,0,.08)',
                          height: 110,
                          background: 'linear-gradient(180deg, rgba(247,245,240,.1), rgba(247,245,240,.45))',
                        }}
                      />

                      <div
                        style={{
                          textAlign: 'center',
                          marginTop: 10,
                          fontFamily: 'var(--font-serif)',
                          fontSize: 'var(--text-base)',
                          color: 'var(--ink-text)',
                        }}
                      >
                        {copy.figure_caption}
                      </div>
                    </>
                  )}
                </div>

                <div
                  style={{
                    marginTop: 16,
                    textAlign: 'center',
                    color: '#999',
                    fontSize: '8pt',
                    lineHeight: 1.2,
                  }}
                >
                  {paperPage.pageNumber}
                </div>

                {marginNotes.map((note, noteIndex) => {
                  const noteItem = reviewItems.find((item) => item.findingId === note.findingId);
                  const noteAction = noteItem ? ruleActions.get(noteItem.label) : undefined;
                  const noteDimmed = !!activeRuleId && note.findingId !== activeRuleId;
                  const notePulsing = emphasizedRuleId === note.findingId;
                  return (
                    <div
                      key={`${paperPage.pageNumber}-note-${noteIndex}`}
                      className={[
                        'diff-margin-note',
                        noteDimmed ? 'is-dimmed' : '',
                        notePulsing ? 'is-emphasis' : '',
                        noteAction === 'accepted' ? 'is-accepted-mark' : '',
                      ].join(' ')}
                      style={{
                        top: 132 + noteIndex * 92,
                      }}
                    >
                      <span className="diff-margin-note-line" />
                      <span className="diff-margin-note-dot" />
                      <div className="diff-margin-note-card">
                        {note.diff?.note}
                      </div>
                    </div>
                  );
                })}

                {overflowNoteCount > 0 && (
                  <div
                    className="diff-margin-note diff-margin-note-overflow"
                    style={{ top: 132 + marginNotes.length * 92 }}
                  >
                    <span className="diff-margin-note-line" />
                    <span className="diff-margin-note-dot" />
                    <div className="diff-margin-note-card">
                      {t('overflow_notes', { count: overflowNoteCount })}
                    </div>
                  </div>
                )}
              </div>
            </article>

            <div
              style={{
                position: 'absolute',
                right: 10,
                bottom: -18,
                color: 'var(--ink-tertiary)',
                fontSize: 'var(--text-xs)',
                letterSpacing: '0.08em',
              }}
            >
              P.{paperPage.pageNumber}
            </div>
          </div>
        );
      })}
      {paperBottomSpacer > 0 && <div aria-hidden="true" style={{ height: paperBottomSpacer }} />}
    </div>
  </div>
);
