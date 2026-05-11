// FindingPane is the navigation and decision surface for findings.
// It subscribes to focusFindingId and never talks directly to Canvas or RulePane.
// Card expansion is handled locally; ResizeObserver keeps the focused card visible.
// Accepted/rejected findings stay navigable and are visually softened, not removed.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Btn } from '../Common';
import type { DiffCopyShape } from '../../screens/step4-diff/diffCopy';
import { reviewActions, useReviewStore, type Finding } from '../../stores/reviewStore';

interface Props {
  copy: DiffCopyShape;
  findings: Finding[];
  onAccept: (finding: Finding) => void;
  onReject: (finding: Finding) => void;
  onSelfEdit: (finding: Finding) => void;
}

export const FindingPane: React.FC<Props> = ({
  copy,
  findings,
  onAccept,
  onReject,
  onSelfEdit,
}) => {
  const listRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Record<string, HTMLElement | null>>({});
  const focusFindingId = useReviewStore((state) => state.focusFindingId);
  const storeFindings = useReviewStore((state) => state.findings);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const displayFindings = storeFindings.length > 0 ? storeFindings : findings;

  const focusedFinding = useMemo(
    () => displayFindings.find((finding) => finding.finding_id === focusFindingId) ?? displayFindings[0] ?? null,
    [displayFindings, focusFindingId],
  );
  const currentIndex = focusedFinding ? Math.max(0, displayFindings.findIndex((finding) => finding.finding_id === focusedFinding.finding_id)) : 0;

  const keepFocusedCardVisible = () => {
    if (!focusedFinding) return;
    const node = cardRefs.current[focusedFinding.finding_id];
    if (!node) return;
    node.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  useEffect(() => {
    keepFocusedCardVisible();
  }, [focusFindingId, focusedFinding?.finding_id]);

  useEffect(() => {
    const node = listRef.current;
    if (!node) return;
    const observer = new ResizeObserver(() => keepFocusedCardVisible());
    observer.observe(node);
    return () => observer.disconnect();
  }, [focusedFinding?.finding_id]);

  if (displayFindings.length === 0) {
    return (
      <aside className="finding-pane" data-testid="diff-review-panel">
        <div className="finding-pane-inner">
          <div className="diff-review-panel-state">
            <div className="diff-review-empty-pen" />
            <div className="diff-review-empty-title">{copy.review_empty_title}</div>
            <div className="diff-review-empty-body">{copy.review_empty_body}</div>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="finding-pane" data-testid="diff-review-panel">
      <div className="finding-pane-inner">
        <div className="finding-pane-head">
          <div className="finding-pane-kicker">现在看</div>
          <div className="finding-pane-count">
            <strong>第 {currentIndex + 1} 处</strong>
            <span>/ 共 {displayFindings.length} 处</span>
          </div>
          <div
            className="finding-pane-dots"
            role="progressbar"
            aria-label="确认进度"
            aria-valuenow={currentIndex + 1}
            aria-valuemin={1}
            aria-valuemax={displayFindings.length}
          >
            {displayFindings.slice(0, Math.min(displayFindings.length, 6)).map((finding, index) => (
              <span
                key={finding.finding_id}
                className={[
                  'diff-review-point',
                  index === Math.min(currentIndex, 5) ? ' is-current' : '',
                  finding.status !== 'pending' ? ' is-done' : '',
                ].join(' ')}
              />
            ))}
          </div>
        </div>

        <div className="finding-pane-list" ref={listRef}>
          {displayFindings.map((finding, index) => {
            const isFocused = finding.finding_id === focusFindingId;
            const isExpanded = finding.finding_id === expandedId;
            return (
              <article
                key={finding.finding_id}
                data-testid={`diff-review-card-${finding.finding_id}`}
                ref={(node) => {
                  cardRefs.current[finding.finding_id] = node;
                }}
                role="article"
                tabIndex={0}
                aria-label={`第 ${finding.pageNo} 页${finding.ruleBreadcrumb.at(-1) || '规范'}修改建议: ${finding.before}改为${finding.after}`}
                className={[
                  'diff-review-card',
                  isFocused ? 'is-focus' : '',
                  finding.status === 'accepted' ? 'is-accepted' : '',
                  finding.status === 'rejected' ? 'is-rejected' : '',
                ].filter(Boolean).join(' ')}
                onMouseEnter={() => reviewActions.setFocus(finding.finding_id, 'pane')}
                onFocus={() => reviewActions.setFocus(finding.finding_id, 'pane')}
                onClick={() => reviewActions.setFocus(finding.finding_id, 'pane')}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    event.stopPropagation();
                    const nextPending = displayFindings.find((candidate) => candidate.finding_id !== finding.finding_id && candidate.status === 'pending');
                    onAccept(finding);
                    if (nextPending) {
                      window.setTimeout(() => {
                        reviewActions.setFocus(nextPending.finding_id, 'pane');
                        cardRefs.current[nextPending.finding_id]?.focus();
                      }, 500);
                    }
                    return;
                  }
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    event.stopPropagation();
                    const nextPending = displayFindings.find((candidate) => candidate.finding_id !== finding.finding_id && candidate.status === 'pending');
                    onReject(finding);
                    if (nextPending) {
                      window.setTimeout(() => {
                        reviewActions.setFocus(nextPending.finding_id, 'pane');
                        cardRefs.current[nextPending.finding_id]?.focus();
                      }, 500);
                    }
                    return;
                  }
                  if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    event.stopPropagation();
                    const next = displayFindings[Math.min(displayFindings.length - 1, index + 1)];
                    if (next) {
                      reviewActions.setFocus(next.finding_id, 'pane');
                      cardRefs.current[next.finding_id]?.focus();
                    }
                    return;
                  }
                  if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    event.stopPropagation();
                    const prev = displayFindings[Math.max(0, index - 1)];
                    if (prev) {
                      reviewActions.setFocus(prev.finding_id, 'pane');
                      cardRefs.current[prev.finding_id]?.focus();
                    }
                  }
                }}
              >
                <div className="diff-review-card-top">
                  <div className="diff-review-card-meta">第 {finding.pageNo} 页 · {finding.ruleBreadcrumb.at(-1) || '格式规范'}</div>
                  <span className="diff-review-card-index">{finding.status === 'accepted' ? '✓' : finding.status === 'rejected' ? '✕' : index + 1}</span>
                </div>
                <div className="diff-review-card-divider" />
                <div className="diff-review-card-main">
                  {finding.status === 'accepted' && <span className="diff-review-card-check">✓</span>}
                  <span className="diff-review-card-main-text">{finding.before} → {finding.after}</span>
                </div>
                <div className="diff-review-card-sub">{finding.suggestionText}</div>

                <button
                  type="button"
                  className="finding-compare-toggle"
                  onClick={(event) => {
                    event.stopPropagation();
                    setExpandedId(isExpanded ? null : finding.finding_id);
                    reviewActions.setFocus(finding.finding_id, 'pane');
                  }}
                >
                  {isExpanded ? '收起修复前/后' : '展开修复前/后'}
                </button>

                {isExpanded && (
                  <div className="finding-inline-compare">
                    <div>
                      <span>修复前</span>
                      <p>{finding.before}</p>
                    </div>
                    <div>
                      <span>修复后</span>
                      <p>{finding.after}</p>
                    </div>
                  </div>
                )}

                <div className="diff-review-card-divider" />
                <div className="diff-review-card-actions" onClick={(event) => event.stopPropagation()}>
                  <Btn title={copy.accept} kind={finding.status === 'accepted' ? 'brand' : 'ghost'} size="sm" onClick={() => onAccept(finding)} style={{ minWidth: 72 }}>
                    {copy.accept}
                  </Btn>
                  <Btn title={copy.reject} kind="ghost" size="sm" onClick={() => onReject(finding)} style={{ minWidth: 72, opacity: finding.status === 'accepted' ? 0.45 : 1 }}>
                    {copy.reject}
                  </Btn>
                  <button type="button" className="diff-review-card-self-edit" onClick={() => onSelfEdit(finding)}>
                    {copy.self_edit} →
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
