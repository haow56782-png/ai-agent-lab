import type { RawParagraph } from './heading-detector.ts';

export interface ParagraphRecognition {
  paragraphId: string;
  text: string;
  styleName?: string;
  font?: string;
  fontSize?: number;
  lineSpacing?: number;
  indent?: number;
  alignment?: string;
  pageIndex: number;
  confidence: number;
  issues: string[];
}

export function detectParagraphs(paragraphs: RawParagraph[]): ParagraphRecognition[] {
  return paragraphs.map(paragraph => {
    const issues: string[] = [];
    if (paragraph.text.includes('\t')) issues.push('tab_indent');
    if (paragraph.text.includes('\v') || paragraph.text.includes('\u2028')) issues.push('soft_return');
    if (!paragraph.text.trim()) issues.push('empty_paragraph');
    if (paragraph.indent !== undefined && paragraph.indent < 0) issues.push('negative_indent');

    return {
      paragraphId: `paragraph-${paragraph.paragraphIndex}`,
      text: paragraph.text,
      styleName: paragraph.styleName,
      font: paragraph.font,
      fontSize: paragraph.fontSize,
      lineSpacing: paragraph.lineSpacing,
      indent: paragraph.indent,
      alignment: paragraph.alignment,
      pageIndex: paragraph.pageIndex ?? 0,
      confidence: paragraph.text.trim() ? 0.96 : 0.8,
      issues,
    };
  });
}

