import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import type { RawFigure } from './figure-detector.ts';
import type { RawParagraph } from './heading-detector.ts';
import type { RawHeaderFooter } from './header-footer-detector.ts';
import type { RawWordStructureInput } from './structure-detector.ts';
import type { RawTable } from './continuation-table-detector.ts';

const requireFromApiGateway = createRequire(new URL('../../../../services/api-gateway/package.json', import.meta.url));
const JSZip = requireFromApiGateway('jszip');

interface DocumentToken {
  type: 'paragraph' | 'table';
  xml: string;
}

function decodeXmlText(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractText(xml: string): string {
  const parts = [...xml.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map(match => match[1]);
  return decodeXmlText(parts.join(''));
}

function extractStyleName(paragraphXml: string): string | undefined {
  return paragraphXml.match(/<w:pStyle[^>]*w:val="([^"]+)"/)?.[1];
}

function extractAlignment(paragraphXml: string): string | undefined {
  return paragraphXml.match(/<w:jc[^>]*w:val="([^"]+)"/)?.[1];
}

function extractFont(paragraphXml: string): string | undefined {
  return paragraphXml.match(/<w:rFonts[^>]*(?:w:eastAsia|w:ascii)="([^"]+)"/)?.[1];
}

function extractFontSize(paragraphXml: string): number | undefined {
  const halfPoints = Number(paragraphXml.match(/<w:sz[^>]*w:val="(\d+)"/)?.[1]);
  return Number.isFinite(halfPoints) && halfPoints > 0 ? halfPoints / 2 : undefined;
}

function extractLineSpacing(paragraphXml: string): number | undefined {
  const spacing = Number(paragraphXml.match(/<w:spacing[^>]*w:line="(\d+)"/)?.[1]);
  return Number.isFinite(spacing) && spacing > 0 ? spacing / 240 : undefined;
}

function extractSpaceBefore(paragraphXml: string): number | undefined {
  const value = Number(paragraphXml.match(/<w:spacing[^>]*w:before="(\d+)"/)?.[1]);
  return Number.isFinite(value) ? value / 20 : undefined;
}

function extractSpaceAfter(paragraphXml: string): number | undefined {
  const value = Number(paragraphXml.match(/<w:spacing[^>]*w:after="(\d+)"/)?.[1]);
  return Number.isFinite(value) ? value / 20 : undefined;
}

function extractIndent(paragraphXml: string): number | undefined {
  const firstLine = Number(paragraphXml.match(/<w:ind[^>]*w:firstLine="(-?\d+)"/)?.[1]);
  return Number.isFinite(firstLine) ? firstLine : undefined;
}

function twipsToMm(value: number): number {
  return Math.round((value / 1440) * 25.4 * 10) / 10;
}

function extractPageMarginsMm(documentXml: string): Record<string, number> | undefined {
  const pgMar = documentXml.match(/<w:pgMar[^>]*>/)?.[0];
  if (!pgMar) return undefined;
  const valueFor = (name: string): number | undefined => {
    const value = Number(pgMar.match(new RegExp(`w:${name}="(-?\\d+)"`))?.[1]);
    return Number.isFinite(value) ? twipsToMm(value) : undefined;
  };
  return {
    top: valueFor('top') ?? 0,
    bottom: valueFor('bottom') ?? 0,
    left: valueFor('left') ?? 0,
    right: valueFor('right') ?? 0,
    gutter: valueFor('gutter') ?? 0,
  };
}

function tokenizeDocument(documentXml: string): DocumentToken[] {
  const body = documentXml.match(/<w:body[^>]*>([\s\S]*?)<\/w:body>/)?.[1] || documentXml;
  const tokens: DocumentToken[] = [];
  const pattern = /<w:p[\s\S]*?<\/w:p>|<w:tbl[\s\S]*?<\/w:tbl>/g;
  for (const match of body.matchAll(pattern)) {
    const xml = match[0];
    tokens.push({ type: xml.startsWith('<w:tbl') ? 'table' : 'paragraph', xml });
  }
  return tokens;
}

function parseParagraph(xml: string, paragraphIndex: number): RawParagraph {
  return {
    text: extractText(xml),
    styleName: extractStyleName(xml),
    pageIndex: Math.floor(paragraphIndex / 18),
    paragraphIndex,
    alignment: extractAlignment(xml),
    font: extractFont(xml),
    fontSize: extractFontSize(xml),
    lineSpacing: extractLineSpacing(xml),
    indent: extractIndent(xml),
    spaceBefore: extractSpaceBefore(xml),
    spaceAfter: extractSpaceAfter(xml),
  };
}

function parseFigure(xml: string, paragraphIndex: number, figureIndex: number): RawFigure[] {
  if (!xml.includes('<w:drawing')) return [];
  const drawingCount = Math.max([...xml.matchAll(/<w:drawing[\s\S]*?<\/w:drawing>/g)].length, 1);
  return Array.from({ length: drawingCount }, (_, offset) => {
    const isInline = xml.includes('<wp:inline');
    const isAnchor = xml.includes('<wp:anchor');
    return {
      figureId: `figure-${figureIndex + offset}`,
      imageType: isInline ? 'inline' : isAnchor ? 'floating' : 'anchored',
      anchorParagraph: paragraphIndex,
      pageIndex: Math.floor(paragraphIndex / 18),
    };
  });
}

function extractFirstRowText(tableXml: string): string[] {
  const firstRow = tableXml.match(/<w:tr[\s\S]*?<\/w:tr>/)?.[0] || '';
  return [...firstRow.matchAll(/<w:tc[\s\S]*?<\/w:tc>/g)].map(cell => extractText(cell[0])).filter(Boolean);
}

function parseTable(tableXml: string, tableIndex: number, paragraphIndex: number, previousParagraphs: RawParagraph[]): RawTable {
  const rowCount = [...tableXml.matchAll(/<w:tr[\s\S]*?<\/w:tr>/g)].length;
  const firstRowText = extractFirstRowText(tableXml);
  const headerTextHash = firstRowText.length
    ? createHash('sha1').update(firstRowText.join('|')).digest('hex')
    : undefined;
  const caption = [...previousParagraphs]
    .reverse()
    .slice(0, 3)
    .find(paragraph => /^(表|Table|续表)\s*[\d一二三四五六七八九十.-]+/i.test(paragraph.text.trim()));
  return {
    tableId: `table-${tableIndex}`,
    tableIndex,
    pageIndex: Math.floor(paragraphIndex / 18),
    columnCount: firstRowText.length,
    rowCount,
    headerRows: firstRowText.length ? [firstRowText] : [],
    headerTextHash,
    tblHeader: tableXml.includes('<w:tblHeader'),
    tblLook: Object.fromEntries([...tableXml.matchAll(/w:(firstRow|lastRow|firstColumn|lastColumn|noHBand|noVBand)="([^"]+)"/g)].map(match => [match[1], match[2]])),
    caption: caption?.text,
    captionId: caption ? `paragraph-${caption.paragraphIndex}` : undefined,
    tableNumber: caption?.text.match(/(?:表|Table|续表)\s*([\d一二三四五六七八九十.-]+)/i)?.[1],
    startParagraphIndex: paragraphIndex,
    endParagraphIndex: paragraphIndex + Math.max(rowCount, 1),
    paragraphsBetween: [],
  };
}

async function readZipText(zip: InstanceType<typeof JSZip>, path: string): Promise<string> {
  return (await zip.file(path)?.async('string')) || '';
}

async function parseHeadersFooters(zip: InstanceType<typeof JSZip>): Promise<RawHeaderFooter[]> {
  const files = Object.keys(zip.files).filter(path => /^word\/(header|footer)\d+\.xml$/.test(path));
  const items: RawHeaderFooter[] = [];
  for (const [index, path] of files.entries()) {
    const xml = await readZipText(zip, path);
    const isHeader = path.includes('/header');
    items.push({
      sectionId: `section-${index}`,
      pageIndex: index,
      headerText: isHeader ? extractText(xml) : undefined,
      footerText: isHeader ? undefined : extractText(xml),
      pageNumber: /\bPAGE\b|<w:fldChar|<w:instrText/i.test(xml) ? String(index + 1) : undefined,
    });
  }
  return items;
}

export async function loadDocxFixture(docxPath: string): Promise<RawWordStructureInput> {
  const content = readFileSync(docxPath);
  const zip = await JSZip.loadAsync(content);
  const documentXml = await readZipText(zip, 'word/document.xml');
  const tokens = tokenizeDocument(documentXml);
  const paragraphs: RawParagraph[] = [];
  const figures: RawFigure[] = [];
  const tables: RawTable[] = [];
  let paragraphIndex = 0;
  let figureIndex = 0;

  for (const token of tokens) {
    if (token.type === 'paragraph') {
      const paragraph = parseParagraph(token.xml, paragraphIndex);
      paragraphs.push(paragraph);
      const parsedFigures = parseFigure(token.xml, paragraphIndex, figureIndex);
      figures.push(...parsedFigures);
      figureIndex += parsedFigures.length;
      paragraphIndex += 1;
    } else {
      const previousEnd = tables[tables.length - 1]?.endParagraphIndex ?? paragraphIndex;
      const table = parseTable(token.xml, tables.length + 1, paragraphIndex, paragraphs);
      table.paragraphsBetween = paragraphs
        .filter(paragraph => paragraph.paragraphIndex > previousEnd && paragraph.paragraphIndex < paragraphIndex)
        .map(paragraph => paragraph.text);
      tables.push(table);
      paragraphIndex += Math.max(table.rowCount, 1);
    }
  }

  return {
    metadata: {
      docxPath,
      parser: 'word-system-skill-docx-fixture-loader',
      tokenCount: tokens.length,
      pageMarginsMm: extractPageMarginsMm(documentXml),
    },
    paragraphs,
    figures,
    tables,
    headersFooters: await parseHeadersFooters(zip),
  };
}
