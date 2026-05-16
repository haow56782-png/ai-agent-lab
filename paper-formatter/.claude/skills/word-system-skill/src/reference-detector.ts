import type { RawParagraph } from './heading-detector.ts';

export interface ReferenceRecognition {
  referenceId: string;
  rawText: string;
  index?: number;
  detectedType: 'chinese' | 'english' | 'url' | 'doi' | 'unknown';
  formatConfidence: number;
  issues: string[];
  fixable: boolean;
  evidence: Record<string, unknown>;
}

function classifyReference(text: string): ReferenceRecognition['detectedType'] {
  if (/doi/i.test(text)) return 'doi';
  if (/https?:\/\//i.test(text)) return 'url';
  if (/[A-Za-z]{4,}/.test(text)) return 'english';
  if (/[\u4e00-\u9fff]/.test(text)) return 'chinese';
  return 'unknown';
}

export function detectReferences(paragraphs: RawParagraph[]): ReferenceRecognition[] {
  const startIndex = paragraphs.findIndex(paragraph => /参考文献|references/i.test(paragraph.text.trim()));
  if (startIndex < 0) return [];
  return paragraphs.slice(startIndex + 1).flatMap(paragraph => {
    const text = paragraph.text.trim();
    if (!text) return [];
    const index = Number(text.match(/^\[?(\d+)\]?/)?.[1]);
    const issues: string[] = [];
    if (!index) issues.push('missing_reference_index');
    if (!/doi|https?:\/\/|\[[JMD]\]|出版社|学报/i.test(text)) issues.push('weak_gb7714_signal');
    return [{
      referenceId: `reference-${paragraph.paragraphIndex}`,
      rawText: text,
      index: Number.isFinite(index) && index > 0 ? index : undefined,
      detectedType: classifyReference(text),
      formatConfidence: issues.length === 0 ? 0.95 : 0.72,
      issues,
      fixable: true,
      evidence: { paragraphIndex: paragraph.paragraphIndex, styleName: paragraph.styleName },
    }];
  });
}

