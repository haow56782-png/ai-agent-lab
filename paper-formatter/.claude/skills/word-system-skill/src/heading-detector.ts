import type { WordSystemWarning } from './rule-engine.ts';

export interface RawParagraph {
  text: string;
  styleName?: string;
  pageIndex?: number;
  paragraphIndex: number;
  alignment?: string;
  numbering?: string;
  font?: string;
  fontSize?: number;
  lineSpacing?: number;
  indent?: number;
  spaceBefore?: number;
  spaceAfter?: number;
}

export interface HeadingRecognition {
  id: string;
  text: string;
  level: 1 | 2 | 3;
  styleName?: string;
  numbering?: string;
  pageIndex: number;
  paragraphIndex: number;
  confidence: number;
  evidence: Record<string, unknown>;
  warnings: WordSystemWarning[];
}

function isTocPseudoHeading(text: string, styleName?: string): boolean {
  return /目录|contents/i.test(styleName || '') || /\.{3,}\s*\d+$/.test(text);
}

function inferHeadingLevel(paragraph: RawParagraph): 1 | 2 | 3 | null {
  const text = paragraph.text.trim();
  const style = paragraph.styleName || '';
  if (/heading\s*1|标题\s*1|一级标题/i.test(style) || /^(第[一二三四五六七八九十\d]+章|[一二三四五六七八九十]+、)/.test(text)) return 1;
  if (/heading\s*2|标题\s*2|二级标题/i.test(style) || /^(\d+\.\d+|[（(][一二三四五六七八九十\d]+[）)])/.test(text)) return 2;
  if (/heading\s*3|标题\s*3|三级标题/i.test(style) || /^\d+\.\d+\.\d+/.test(text)) return 3;
  if (paragraph.alignment === 'center' && text.length > 0 && text.length <= 28) return 1;
  return null;
}

export function detectHeadings(paragraphs: RawParagraph[]): HeadingRecognition[] {
  return paragraphs.flatMap(paragraph => {
    const text = paragraph.text.trim();
    if (!text || isTocPseudoHeading(text, paragraph.styleName)) return [];
    const level = inferHeadingLevel(paragraph);
    if (!level) return [];
    const confidence = paragraph.styleName?.match(/heading|标题/i) ? 0.98 : paragraph.alignment === 'center' ? 0.78 : 0.9;
    return [{
      id: `heading-${paragraph.paragraphIndex}`,
      text,
      level,
      styleName: paragraph.styleName,
      numbering: paragraph.numbering || text.match(/^([第\d一二三四五六七八九十、.（）()]+)/)?.[1],
      pageIndex: paragraph.pageIndex ?? 0,
      paragraphIndex: paragraph.paragraphIndex,
      confidence,
      evidence: {
        styleName: paragraph.styleName,
        alignment: paragraph.alignment,
        numbering: paragraph.numbering,
      },
      warnings: confidence < 0.85 ? [{
        warningId: `heading-${paragraph.paragraphIndex}-low-confidence`,
        warningCode: 'LOW_CONFIDENCE_RECOGNITION',
        severity: 'warning',
        message: '标题识别置信度不足，需要人工复核。',
        source: 'heading-detector',
        evidence: { text, styleName: paragraph.styleName, alignment: paragraph.alignment },
        recoveryAction: '检查标题样式或编号规则。',
      }] : [],
    }];
  });
}

