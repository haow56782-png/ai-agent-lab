import React, { useEffect, useState } from 'react';
import type { FixAction } from '../../mock/fixActions';
import type { PaperBlock, PaperPage } from '../../mock/paperContent';
import { PenCursor, type PenCursorState } from '../PenCursor';
import type { AnnotationLayout, FixRuntimeStore, PageDecorations, RecentActionMeta } from './types';
import {
  getBlockStyle,
  getCharKey,
  getPageChapter,
  isTextBlock,
  renderTable,
} from './utils';

function formatPaperRevisionLabel(payload: string): string {
  const normalized = payload.replace(/\s+/g, '').trim();
  if (!normalized) return '已调整';
  if (normalized.length <= 5 && !/[，。；、:：]/.test(normalized)) return normalized;
  if (/目录|页码/.test(normalized)) return '目录页码';
  if (/页眉|页脚/.test(normalized)) return '页眉页脚';
  if (/标题|层级|编号/.test(normalized)) return '标题样式';
  if (/参考文献|DOI|著录/.test(normalized)) return '著录格式';
  if (/图片|印章|水印|图层|浮动/.test(normalized)) return '图层顺序';
  if (/正文|字体|行距|段落/.test(normalized)) return '正文格式';
  return '格式检查';
}

function isPageLayoutAction(action: FixAction): boolean {
  const signal = `${action.findingLabel} ${action.rule.name} ${action.payload}`.toLowerCase();
  return /页边距|页面|版心|纸张|装订线|page|margin|canvas/.test(signal);
}

interface Props {
  runtimeStore: FixRuntimeStore;
  currentPaperPage: PaperPage;
  previousPage: PaperPage | null;
  isPageFlipping: boolean;
  paperBow: boolean;
  pageDecorations: PageDecorations;
  annotationLayouts: Record<string, AnnotationLayout>;
  activeActionSet: Set<string>;
  activeParagraphKey: string | null;
  currentPageActions: FixAction[];
  recentActionMeta: Record<string, RecentActionMeta>;
  annotationStateMap: Map<string, 'active' | 'stale'>;
  freshInsertIds: string[];
  charRefs: React.MutableRefObject<Record<string, HTMLSpanElement | null>>;
  livePageRef: React.RefObject<HTMLDivElement | null>;
  showPauseHint: boolean;
  penPosition: { x: number; y: number };
  penState: PenCursorState;
  penTransitionMs: number;
}

export const FixRuntimePaperStage: React.FC<Props> = ({
  runtimeStore,
  currentPaperPage,
  previousPage,
  isPageFlipping,
  paperBow,
  pageDecorations,
  annotationLayouts,
  activeActionSet,
  activeParagraphKey,
  currentPageActions,
  recentActionMeta,
  annotationStateMap,
  freshInsertIds,
  charRefs,
  livePageRef,
  showPauseHint,
  penPosition,
  penState,
  penTransitionMs,
}) => {
  const [openPopoverKey, setOpenPopoverKey] = useState<string | null>(null);
  const activeSceneAction = currentPageActions.find((action) => activeActionSet.has(action.id))
    || currentPageActions[0]
    || null;
  const hasActivePageLayoutAction = Boolean(activeSceneAction && isPageLayoutAction(activeSceneAction));

  // Auto-scroll to the highlighted paragraph when the user clicks a right card.
  useEffect(() => {
    if (activeActionSet.size > 0 && !activeParagraphKey) {
      const raf = requestAnimationFrame(() => {
        if (!livePageRef.current) return;
        const target = livePageRef.current.querySelector('.is-recent-review');
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [activeActionSet, activeParagraphKey, currentPaperPage.pageNumber, livePageRef]);

  function renderInsertedSpans(paragraphIndex: number, offset: number) {
    const insertActions = pageDecorations.inserts.get(`${paragraphIndex}:${offset}`) || [];
    if (insertActions.length === 0) return null;
    return insertActions.map((action) => (
      <span
        key={action.id}
        className={[
          'fix-paper-insert',
          freshInsertIds.includes(action.id) ? 'is-fresh' : '',
          activeActionSet.has(action.id) ? 'is-live' : '',
        ].filter(Boolean).join(' ')}
      >
        {action.payload}
      </span>
    ));
  }

  function renderRichText(
    block: PaperBlock,
    blockIndex: number,
    paragraphIndex: number,
    className: string,
    tag: 'p' | 'h1' | 'h2' | 'h3' | 'figcaption',
  ) {
    const chars = Array.from(block.content);
    const nodes: React.ReactNode[] = [];
    const paragraphReviewKey = `${currentPaperPage.pageNumber}:${paragraphIndex}`;
    const activeActionsInParagraph = currentPageActions.filter((action) =>
      !isPageLayoutAction(action) &&
      activeActionSet.has(action.id) &&
      action.locator.page === currentPaperPage.pageNumber &&
      action.locator.paragraphIndex === paragraphIndex
    );
    const hasRecentHighlight = currentPageActions.some((action) => {
      if (isPageLayoutAction(action)) return false;
      if (action.locator.page !== currentPaperPage.pageNumber || action.locator.paragraphIndex !== paragraphIndex) return false;
      const meta = recentActionMeta[action.id];
      return activeActionSet.has(action.id) || (meta ? Date.now() - meta.completedAt <= 1500 : false);
    });
    const issueAction = activeActionsInParagraph[0]
      || currentPageActions.find((action) => {
        if (isPageLayoutAction(action)) return false;
        if (action.locator.page !== currentPaperPage.pageNumber || action.locator.paragraphIndex !== paragraphIndex) return false;
        const meta = recentActionMeta[action.id];
        return Boolean(meta && Date.now() - meta.completedAt <= 1500);
      })
      || null;
    const issueStatusLabel = activeActionsInParagraph.length > 0
      ? '正在修复'
      : issueAction?.type === 'annotate'
      ? '待确认'
      : issueAction
      ? '已写回'
      : null;

    chars.forEach((char, charIndex) => {
      nodes.push(renderInsertedSpans(paragraphIndex, charIndex));
      const content = char === ' ' ? '\u00A0' : char;
      const rangeKey = `${paragraphIndex}:${charIndex}`;
      const replacement = pageDecorations.replacements.get(rangeKey);
      const activeInkAction = activeActionsInParagraph.find((action) => {
        const start = action.locator.charOffset;
        const end = start + Math.max(action.locator.length, 1);
        return charIndex >= start && charIndex < end;
      });
      nodes.push(
        <span
          key={`${paragraphIndex}-${charIndex}`}
          ref={(node) => {
            charRefs.current[getCharKey(currentPaperPage.pageNumber, paragraphIndex, charIndex)] = node;
          }}
          className={[
            'fix-paper-char',
            activeInkAction ? 'is-ink-target' : '',
            pageDecorations.deletedKeys.has(rangeKey) ? 'is-review-deleted' : '',
            pageDecorations.activeDeletedKeys.has(rangeKey) ? 'is-review-live' : '',
          ].filter(Boolean).join(' ')}
          data-live-action={activeInkAction?.type || undefined}
        >
          {content}
          {replacement && (
            <sup
              className={replacement.active ? 'fix-paper-replace-note is-live' : 'fix-paper-replace-note'}
              title={replacement.payload}
            >
              {replacement.active ? '正在修复' : '已修复'}
            </sup>
          )}
        </span>,
      );
    });

    nodes.push(renderInsertedSpans(paragraphIndex, chars.length));
    if (issueAction && issueStatusLabel) {
      const popoverKey = `${currentPaperPage.pageNumber}:${paragraphIndex}`;
      nodes.push(
        <span
          key={`${paragraphIndex}-issue-label`}
          className={`fix-issue-status-label status-${activeActionsInParagraph.length > 0 ? 'fixing' : issueAction.type === 'annotate' ? 'review' : 'done'}`}
          onClick={(event) => {
            event.stopPropagation();
            setOpenPopoverKey((current) => current === popoverKey ? null : popoverKey);
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            setOpenPopoverKey((current) => current === popoverKey ? null : popoverKey);
          }}
        >
          {issueStatusLabel}
          <span className={openPopoverKey === popoverKey ? 'fix-issue-popover is-open' : 'fix-issue-popover'}>
            <strong>问题：{formatPaperRevisionLabel(issueAction.findingLabel)}</strong>
            <em>位置：第 {currentPaperPage.pageNumber} 页 · {getPageChapter(currentPaperPage)}</em>
            <em>当前：格式属性与规则不一致</em>
            <em>目标：按学校规则与 GB/T 7713.1 统一</em>
            <em>动作：仅调整格式属性，不修改文字内容</em>
            <em>状态：{issueStatusLabel === '已写回' ? '已写回，等待最终确认' : issueStatusLabel}</em>
          </span>
        </span>,
      );
    }

    const commonProps = {
      className: [
        'fix-paper-block',
        className,
        activeParagraphKey === paragraphReviewKey ? 'is-batch-live' : '',
        activeActionsInParagraph.length > 0 ? 'is-writing-now' : '',
        hasRecentHighlight ? 'is-recent-review' : '',
      ].filter(Boolean).join(' '),
      style: getBlockStyle(block),
    };

    if (tag === 'h1') return <h1 key={`${block.type}-${blockIndex}`} {...commonProps}>{nodes}</h1>;
    if (tag === 'h2') return <h2 key={`${block.type}-${blockIndex}`} {...commonProps}>{nodes}</h2>;
    if (tag === 'h3') return <h3 key={`${block.type}-${blockIndex}`} {...commonProps}>{nodes}</h3>;
    if (tag === 'figcaption') return <figcaption key={`${block.type}-${blockIndex}`} {...commonProps}>{nodes}</figcaption>;
    return <p key={`${block.type}-${blockIndex}`} {...commonProps}>{nodes}</p>;
  }

  function renderPaperPage(page: PaperPage, live: boolean) {
    let paragraphIndex = 0;
    return (
      <div
        ref={live ? livePageRef : null}
        className={[
          'fix-runtime-page-panel',
          live ? 'fix-runtime-page-panel-live' : '',
          live && activeActionSet.size > 0 ? 'has-active-action' : '',
        ].filter(Boolean).join(' ')}
        key={`page-${page.pageNumber}-${live ? 'live' : 'static'}`}
        data-testid={live ? 'fix-runtime-live-page' : undefined}
        data-page-number={page.pageNumber}
      >
        <div className="fix-runtime-paper-header mono">{page.header}</div>
        <div className="fix-runtime-paper-footer mono" data-testid={live ? 'fix-runtime-live-page-footer' : undefined}>{page.footer}</div>
        <div className="fix-runtime-paper-inner">
          {page.blocks.map((block, index) => {
            const currentParagraphIndex = isTextBlock(block) ? paragraphIndex++ : null;
            if (block.type === 'h1') {
              return live && currentParagraphIndex !== null
                ? renderRichText(block, index, currentParagraphIndex, 'fix-paper-title', 'h1')
                : <h1 key={`${block.type}-${index}`} className="fix-paper-block fix-paper-title" style={getBlockStyle(block)}>{block.content}</h1>;
            }
            if (block.type === 'h2') {
              return live && currentParagraphIndex !== null
                ? renderRichText(block, index, currentParagraphIndex, 'fix-paper-chapter', 'h2')
                : <h2 key={`${block.type}-${index}`} className="fix-paper-block fix-paper-chapter" style={getBlockStyle(block)}>{block.content}</h2>;
            }
            if (block.type === 'h3') {
              return live && currentParagraphIndex !== null
                ? renderRichText(block, index, currentParagraphIndex, 'fix-paper-subchapter', 'h3')
                : <h3 key={`${block.type}-${index}`} className="fix-paper-block fix-paper-subchapter" style={getBlockStyle(block)}>{block.content}</h3>;
            }
            if (block.type === 'figure') {
              return (
                <figure key={`${block.type}-${index}`} className="fix-paper-figure-wrap" style={getBlockStyle(block)}>
                  <div className="fix-paper-figure-box" />
                  <figcaption className="fix-paper-figure" style={getBlockStyle(block)}>
                    {block.content}
                  </figcaption>
                </figure>
              );
            }
            if (block.type === 'table') {
              return (
                <div key={`${block.type}-${index}`} className="fix-paper-table-wrap" style={getBlockStyle(block)}>
                  {renderTable(block.content)}
                </div>
              );
            }
            if (block.type === 'reference') {
              return live && currentParagraphIndex !== null
                ? renderRichText(block, index, currentParagraphIndex, 'fix-paper-reference', 'p')
                : <p key={`${block.type}-${index}`} className="fix-paper-block fix-paper-reference" style={getBlockStyle(block)}>{block.content}</p>;
            }
            return live && currentParagraphIndex !== null
              ? renderRichText(block, index, currentParagraphIndex, 'fix-paper-paragraph', 'p')
              : <p key={`${block.type}-${index}`} className="fix-paper-block fix-paper-paragraph" style={getBlockStyle(block)}>{block.content}</p>;
          })}
        </div>

        {live && pageDecorations.annotations.length > 0 && (
          <div className="fix-paper-annotation-layer" aria-hidden="true">
            {pageDecorations.annotations.map((action) => {
              const layout = annotationLayouts[action.id];
              if (!layout) return null;
              return (
                <div
                  key={action.id}
                  className={[
                    'fix-paper-annotation',
                    activeActionSet.has(action.id) ? 'is-live' : '',
                    annotationStateMap.get(action.id) === 'stale' ? 'is-stale' : '',
                  ].filter(Boolean).join(' ')}
                  style={{
                    top: `${layout.top}px`,
                    left: `${layout.left}px`,
                    width: `${layout.noteWidth}px`,
                  }}
                >
                  <span
                    className="fix-paper-annotation-leader"
                    style={{ width: `${layout.leaderWidth}px` }}
                  />
                  <span className="fix-paper-annotation-text">{action.payload}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`fix-runtime-paperframe ${runtimeStore.status === 'running' ? 'is-runtime-running' : ''} ${activeActionSet.size > 0 ? 'is-writing-now' : ''}`}>
      <div className="fix-runtime-printer-head" aria-hidden="true" />
      <div className="fix-runtime-paper-glow" aria-hidden="true" />
      <article className={paperBow ? 'fix-runtime-a4 is-bowing' : 'fix-runtime-a4'} aria-label="论文修复工作台">
        {runtimeStore.status === 'running' && (
          <div className="fix-runtime-paper-scanner" aria-hidden="true" data-testid="fix-runtime-paper-scanner">
            <span className="fix-runtime-paper-scanner-beam" />
            <span className="fix-runtime-paper-scanner-label mono">
              正在定位 · {runtimeStore.fixedItems}/{runtimeStore.totalItems}
            </span>
          </div>
        )}
        {hasActivePageLayoutAction ? <div className="fix-paper-layout-highlight" aria-hidden="true" /> : null}
        <div className="fix-runtime-page-viewport">
          <div className={`fix-runtime-page-stack ${isPageFlipping ? 'is-flipping' : ''}`}>
            {isPageFlipping && previousPage && renderPaperPage(previousPage, false)}
            {renderPaperPage(currentPaperPage, true)}
          </div>
        </div>
      </article>
      <PenCursor
        x={penPosition.x}
        y={penPosition.y}
        state={penState}
        transitionMs={penTransitionMs}
        idleDurationMs={runtimeStore.speed === 2 ? 1200 : 2400}
        disableIdleFloat={runtimeStore.speed === 4}
      />
      {showPauseHint && (
        <div className="fix-runtime-hint">按空格暂停</div>
      )}
    </div>
  );
};
