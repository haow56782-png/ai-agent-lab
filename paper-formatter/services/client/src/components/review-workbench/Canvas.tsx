// Canvas renders the thesis pages and finding anchors.
// It never owns currentPage; it derives the focused page from focusFindingId.
// Anchor visibility is reported through IntersectionObserver only.
// Pane/rule focus jumps use instant canvas positioning to avoid feedback loops.
import React, { useEffect, useMemo, useRef } from 'react';
import type { DiffCopyShape } from '../../screens/step4-diff/diffCopy';
import type { PaperPage } from '../../screens/step4-diff/types';
import { A4_MARGIN_BOTTOM, A4_MARGIN_LEFT, A4_MARGIN_RIGHT, A4_MARGIN_TOP } from '../../screens/step4-diff/types';
import { useFindingObserver } from '../../hooks/useFindingObserver';
import { selectFocusedFindingPage, useReviewStore, type Finding } from '../../stores/reviewStore';

interface Props {
  pages: PaperPage[];
  findings: Finding[];
  paperHeader: string;
  paperTitle: string;
  copy: DiffCopyShape;
  paperBow: boolean;
  isAllAccepted: boolean;
}

export const Canvas: React.FC<Props> = ({
  pages,
  findings,
  paperHeader,
  paperTitle,
  copy,
  paperBow,
  isAllAccepted,
}) => {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const focusFindingId = useReviewStore((state) => state.focusFindingId);
  const scrollSource = useReviewStore((state) => state.scrollSource);
  const focusedFindingPage = useReviewStore(selectFocusedFindingPage);
  const focusedFinding = useReviewStore((state) => state.findings.find((finding) => finding.finding_id === state.focusFindingId) ?? null);
  const { registerFindingAnchor } = useFindingObserver({ rootRef: viewportRef });

  const findingsByPage = useMemo(() => {
    const map = new Map<number, Finding[]>();
    findings.forEach((finding) => {
      map.set(finding.pageNo, [...(map.get(finding.pageNo) ?? []), finding]);
    });
    return map;
  }, [findings]);

  useEffect(() => {
    if (!focusedFindingPage || scrollSource === 'canvas') return;
    const viewport = viewportRef.current;
    const pageNode = pageRefs.current[focusedFindingPage];
    if (!viewport || !pageNode) return;
    viewport.scrollTo({ top: Math.max(0, pageNode.offsetTop - 4), behavior: 'auto' });
  }, [focusedFindingPage, scrollSource]);

  if (pages.length === 0) {
    return (
      <div className="finding-canvas-empty" data-testid="diff-paper-stream">
        <div>还没有可审查的论文页面</div>
        <span>完成修复后，这里会显示逐页批注结果。</span>
      </div>
    );
  }

  return (
    <div
      data-testid="diff-paper-stream"
      ref={viewportRef}
      className="finding-canvas"
    >
      <div className="finding-canvas-stack">
        {pages.map((page) => {
          const pageFindings = findingsByPage.get(page.pageNumber) ?? [];
          return (
            <div
              key={page.pageNumber}
              data-testid={`diff-paper-page-${page.pageNumber}`}
              ref={(node) => {
                pageRefs.current[page.pageNumber] = node;
              }}
              className="finding-paper-wrap"
            >
              <article className={paperBow && isAllAccepted ? 'finding-paper diff-paper-bow' : 'finding-paper'}>
                <div
                  className="finding-paper-body"
                  style={{
                    top: A4_MARGIN_TOP,
                    right: A4_MARGIN_RIGHT,
                    bottom: A4_MARGIN_BOTTOM,
                    left: A4_MARGIN_LEFT,
                  }}
                >
                  <div className="finding-paper-header">{paperHeader}</div>
                  {page.pageNumber === 1 && <h1 className="finding-paper-title">{paperTitle}</h1>}
                  <h2 className="finding-paper-chapter">{page.pageNumber === 1 ? copy.abstract_title : page.chapter}</h2>

                  <div className="finding-paper-paragraphs">
                    {page.paragraphList.map((paragraph, paragraphIndex) => {
                      const paragraphFindings = pageFindings.filter((finding) => Math.floor(finding.anchorRect.y / 100) === paragraphIndex);
                      const primaryFinding = paragraphFindings[0];
                      const isFocused = primaryFinding?.finding_id === focusFindingId;
                      const isDimmed = !!focusFindingId && !!primaryFinding && !isFocused;
                      return (
                        <p
                          key={`${page.pageNumber}-${paragraphIndex}`}
                          ref={(node) => {
                            if (primaryFinding) registerFindingAnchor(primaryFinding.finding_id, node);
                          }}
                          data-finding-id={primaryFinding?.finding_id}
                          className={[
                            primaryFinding ? 'finding-paper-paragraph has-finding' : 'finding-paper-paragraph',
                            isFocused ? 'is-focus' : '',
                            isDimmed ? 'is-dimmed' : '',
                            primaryFinding?.status !== 'pending' ? 'is-processed' : '',
                          ].filter(Boolean).join(' ')}
                        >
                          {primaryFinding && (
                            <span
                              className="finding-anchor"
                              style={{
                                insetInlineStart: `${primaryFinding.anchorRect.x}%`,
                                width: `${primaryFinding.anchorRect.w}%`,
                              }}
                              aria-label={`第 ${primaryFinding.pageNo} 页问题: ${primaryFinding.problem}`}
                            />
                          )}
                          <span>{paragraph}</span>
                          {primaryFinding && (
                            <span className="finding-inline-note">
                              {primaryFinding.before} → {primaryFinding.after}
                            </span>
                          )}
                        </p>
                      );
                    })}

                    {page.pageNumber === 1 && (
                      <>
                        <div className="finding-paper-figure" />
                        <div className="finding-paper-caption">{copy.figure_caption}</div>
                      </>
                    )}
                  </div>

                  <div className="finding-paper-footer">{page.pageNumber}</div>
                  {pageFindings.slice(0, 5).map((finding, index) => (
                    <div
                      key={`${finding.finding_id}-margin`}
                      className={[
                        'finding-margin-note',
                        finding.finding_id === focusFindingId ? 'is-focus' : '',
                        focusedFinding && finding.finding_id !== focusedFinding.finding_id ? 'is-dimmed' : '',
                        finding.status !== 'pending' ? 'is-processed' : '',
                      ].filter(Boolean).join(' ')}
                      style={{ top: 132 + index * 86 }}
                    >
                      <span className="finding-margin-line" />
                      <span className="finding-margin-dot" />
                      <div>{finding.suggestionText}</div>
                    </div>
                  ))}
                </div>
              </article>
              <div className="finding-paper-watermark">P.{page.pageNumber}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
