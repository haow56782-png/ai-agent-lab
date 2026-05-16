import type { RawParagraph } from './heading-detector.ts';
import type { WordSystemWarning } from './rule-engine.ts';

export interface RawFigure {
  figureId?: string;
  imageType: 'inline' | 'floating' | 'anchored' | 'watermark' | 'background' | 'seal';
  anchorParagraph: number;
  pageIndex?: number;
  numberToken?: string;
}

export interface FigureRecognition {
  figureId: string;
  imageType: RawFigure['imageType'];
  anchorParagraph: number;
  pageIndex: number;
  caption?: string;
  captionId?: string;
  figureNumber?: string;
  confidence: number;
  evidence: Record<string, unknown>;
  warnings: WordSystemWarning[];
}

function findCaption(figure: RawFigure, paragraphs: RawParagraph[]): RawParagraph | undefined {
  return paragraphs
    .filter(paragraph => paragraph.paragraphIndex > figure.anchorParagraph)
    .filter(paragraph => paragraph.paragraphIndex - figure.anchorParagraph <= 3)
    .find(paragraph => /^(图|Fig(?:ure)?\.?)\s*[\d一二三四五六七八九十.-]+/i.test(paragraph.text.trim()));
}

export function detectFigures(figures: RawFigure[], paragraphs: RawParagraph[]): FigureRecognition[] {
  return figures.flatMap((figure, index) => {
    if (figure.imageType === 'watermark' || figure.imageType === 'background') return [];
    const caption = findCaption(figure, paragraphs);
    const warnings: WordSystemWarning[] = [];
    if (!caption && figure.imageType !== 'seal') {
      warnings.push({
        warningId: `figure-${index}-caption-unbound`,
        warningCode: 'CAPTION_UNBOUND',
        severity: 'warning',
        message: '图对象未找到可靠图题绑定。',
        source: 'figure-detector',
        evidence: { anchorParagraph: figure.anchorParagraph, imageType: figure.imageType },
        recoveryAction: '检查图题位置或对象锚点。',
      });
    }

    return [{
      figureId: figure.figureId || `figure-${index}`,
      imageType: figure.imageType,
      anchorParagraph: figure.anchorParagraph,
      pageIndex: figure.pageIndex ?? 0,
      caption: caption?.text.trim(),
      captionId: caption ? `paragraph-${caption.paragraphIndex}` : undefined,
      figureNumber: caption?.text.match(/(?:图|Fig(?:ure)?\.?)\s*([\d一二三四五六七八九十.-]+)/i)?.[1] || figure.numberToken,
      confidence: caption ? 0.95 : 0.7,
      evidence: {
        anchorParagraph: figure.anchorParagraph,
        captionParagraphIndex: caption?.paragraphIndex,
        imageType: figure.imageType,
      },
      warnings,
    }];
  });
}

