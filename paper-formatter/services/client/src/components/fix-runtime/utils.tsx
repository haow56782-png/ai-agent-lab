import React from 'react';
import type { FixAction } from '../../mock/fixActions';
import type { PaperBlock, PaperPage } from '../../mock/paperContent';
import type {
  FixRuntimeStore,
  PageTextBlock,
  TimelineRowSummary,
} from './types';

export const MM_TO_PX = 3.7795275591;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function formatDuration(ms: number): string {
  const safeMs = Math.max(0, ms);
  const totalSeconds = Math.ceil(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes <= 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

export function formatTimestamp(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function getSimulatedElapsedMs(store: FixRuntimeStore): number {
  return Math.max(0, Math.round(store.elapsedMs * store.speed));
}

export function isTextBlock(block: PaperBlock): boolean {
  return block.type === 'h1' || block.type === 'h2' || block.type === 'h3' || block.type === 'p' || block.type === 'reference';
}

export function getBlockStyle(block: PaperBlock): React.CSSProperties {
  return {
    fontFamily: block.originalStyle.font,
    fontSize: `${block.originalStyle.size}pt`,
    lineHeight: `${block.originalStyle.lineHeight}pt`,
    marginTop: `${block.originalStyle.spaceBefore}pt`,
    marginBottom: `${block.originalStyle.spaceAfter}pt`,
    textIndent: block.type === 'p' ? `${block.originalStyle.indent}em` : 0,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  };
}

export function getPageTextBlocks(page: PaperPage): PageTextBlock[] {
  const blocks: PageTextBlock[] = [];
  let paragraphIndex = 0;
  page.blocks.forEach((block, blockIndex) => {
    if (!isTextBlock(block)) return;
    blocks.push({
      paragraphIndex,
      blockIndex,
      block,
    });
    paragraphIndex += 1;
  });
  return blocks;
}

export function getPageChapter(page: PaperPage): string {
  const heading = page.blocks.find(block => block.type === 'h2' || block.type === 'h3' || block.type === 'h1');
  return heading?.content || `第 ${page.pageNumber} 页`;
}

export function getBlockByParagraphIndex(page: PaperPage, paragraphIndex: number): PaperBlock | null {
  return getPageTextBlocks(page).find(block => block.paragraphIndex === paragraphIndex)?.block || null;
}

export function getCharKey(page: number, paragraphIndex: number, charIndex: number): string {
  return `${page}:${paragraphIndex}:${charIndex}`;
}

export function resolveRuleCardId(source: FixAction['rule']['source']): 'school' | 'baseline' {
  return source === '国标' ? 'baseline' : 'school';
}

export function getActionDuration(type: FixAction['type'], speed: 1 | 2 | 4): number {
  const scale = 1 / speed;
  if (type === 'delete') return Math.max(180, 420 * scale);
  if (type === 'replace') return Math.max(260, 760 * scale);
  if (type === 'annotate') return Math.max(340, 1120 * scale);
  return Math.max(220, 680 * scale);
}

export function getPenPositionFromRect(rect?: DOMRect | null) {
  if (!rect) return { x: -100, y: -100 };
  return {
    x: rect.left - 10,
    y: rect.top - 18,
  };
}

export function renderTable(content: string) {
  const rows = content
    .split('\n')
    .map(line => line.split('|').map(cell => cell.trim()))
    .filter(row => row.length > 1);

  if (rows.length === 0) return null;

  return (
    <table className="fix-paper-table">
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={`${row.join('-')}-${rowIndex}`}>
            {row.map((cell, cellIndex) => (
              <td key={`${cell}-${cellIndex}`}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function summarizeAction(page: PaperPage, action: FixAction): TimelineRowSummary {
  const blocks = getPageTextBlocks(page);
  const targetBlock = blocks.find(block => block.paragraphIndex === action.locator.paragraphIndex);
  const chapter = getPageChapter(page);
  if (!targetBlock) {
    return {
      chapter,
      before: '定位到当前段落',
      after: action.payload,
      ruleLabel: `${action.rule.source} · ${action.rule.name}`,
      type: action.type,
    };
  }

  const chars = Array.from(targetBlock.block.content);
  const start = clamp(action.locator.charOffset, 0, Math.max(chars.length - 1, 0));
  const length = Math.max(1, action.locator.length);
  const original = chars.slice(start, start + length).join('') || chars[start] || '当前字符';

  if (action.type === 'insert') {
    return {
      chapter,
      before: `在“${original}”后补入`,
      after: `插入“${action.payload}”`,
      ruleLabel: `${action.rule.source} · ${action.rule.name}`,
      type: action.type,
    };
  }

  if (action.type === 'delete') {
    return {
      chapter,
      before: `删去“${original}”`,
      after: '保留删改痕迹，等待学生确认',
      ruleLabel: `${action.rule.source} · ${action.rule.name}`,
      type: action.type,
    };
  }

  if (action.type === 'replace') {
    return {
      chapter,
      before: `原文“${original}”`,
      after: `改为上标提示“${action.payload}”`,
      ruleLabel: `${action.rule.source} · ${action.rule.name}`,
      type: action.type,
    };
  }

  return {
    chapter,
    before: `页边批注定位到“${original}”`,
    after: action.payload,
    ruleLabel: `${action.rule.source} · ${action.rule.name}`,
    type: action.type,
  };
}
