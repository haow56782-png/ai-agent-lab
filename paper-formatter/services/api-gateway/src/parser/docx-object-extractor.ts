/**
 * L1 DOCX object extractor.
 * Reads Word XML directly and emits raw figure/table/caption evidence for the
 * future Object Graph builder. It is a side-channel extractor and is not wired
 * into the existing parser or analyze job flow in PR #3.
 */
import crypto from "node:crypto";
import { readFile } from "node:fs/promises";

import { XMLParser } from "fast-xml-parser";
import JSZip from "jszip";

import type { CaptionKind, DrawingWrapMode } from "./object-graph/types.js";

const ATTR_KEY = ":@";

type XmlEntry = Record<string, unknown>;
type CaptionPattern = "figure" | "table" | "continuation";

export interface ExtractedDocxParagraph {
  bodyIndex: number;
  paragraphIndex: number;
  text: string;
  styleName: string;
}

export interface ExtractedDocxTable {
  objectId: string;
  bodyIndex: number;
  startParagraphIndex: number;
  endParagraphIndex: number;
  rowCount: number;
  columnCount: number;
  headerRowCount: number;
  hasTblHeaderInFirstRow: boolean;
  tblLookAttributes: Record<string, string>;
  firstRowText: string[];
  headerRowTextHash: string;
  schemaFingerprint: string;
}

export interface ExtractedDocxDrawing {
  objectId: string;
  bodyIndex: number;
  anchorParagraphIndex: number;
  wrapMode: DrawingWrapMode;
  relationshipId: string;
  isInline: boolean;
}

export interface ExtractedCaptionCandidate {
  objectId: string;
  bodyIndex: number;
  paragraphIndex: number;
  text: string;
  styleName: string;
  matchedPattern: CaptionPattern;
  captionKind: CaptionKind;
  numberToken: string;
  isContinuation: boolean;
}

export interface ExtractedAdjacentTablePair {
  prevTableObjectId: string;
  currTableObjectId: string;
  prevTableIndex: number;
  currTableIndex: number;
  paragraphsBetween: Array<{ paragraphIndex: number; text: string }>;
  captionsBetween: ExtractedCaptionCandidate[];
}

export interface DocxObjectExtractionWarning {
  code: "missing_document_xml" | "missing_document_body" | "xml_parse_failed";
  message: string;
}

export interface DocxObjectExtraction {
  docxPath?: string;
  stats: {
    paragraphCount: number;
    tableCount: number;
    drawingCount: number;
    captionCandidateCount: number;
  };
  paragraphs: ExtractedDocxParagraph[];
  tables: ExtractedDocxTable[];
  drawings: ExtractedDocxDrawing[];
  captionCandidates: ExtractedCaptionCandidate[];
  adjacentTablePairs: ExtractedAdjacentTablePair[];
  warnings: DocxObjectExtractionWarning[];
}

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  preserveOrder: true,
  trimValues: false,
});

const FIGURE_CAPTION_RE = /^(图|Fig(?:ure)?\.?)\s*([\d\-.]+)/i;
const TABLE_CAPTION_RE = /^(表|Table)\s*([\d\-.]+)/i;
const CONTINUATION_CAPTION_RE = /^(续表|表\s*[\d\-.]+\s*[\(（]续[\)）]|continued)/i;

export async function extractDocxObjectsFromDocxPath(docxPath: string): Promise<DocxObjectExtraction> {
  const buffer = await readFile(docxPath);
  return extractDocxObjectsFromDocxBuffer(buffer, { docxPath });
}

export async function extractDocxObjectsFromDocxBuffer(
  buffer: Buffer,
  options: { docxPath?: string } = {},
): Promise<DocxObjectExtraction> {
  const zip = await JSZip.loadAsync(buffer);
  const documentXmlFile = zip.file("word/document.xml");
  if (!documentXmlFile) {
    return emptyExtraction(options.docxPath, {
      code: "missing_document_xml",
      message: "DOCX package does not contain word/document.xml",
    });
  }
  const xml = await documentXmlFile.async("string");
  return extractDocxObjectsFromDocumentXml(xml, options);
}

export function extractDocxObjectsFromDocumentXml(
  documentXml: string,
  options: { docxPath?: string } = {},
): DocxObjectExtraction {
  let parsed: XmlEntry[];
  try {
    parsed = xmlParser.parse(documentXml) as XmlEntry[];
  } catch (error) {
    return emptyExtraction(options.docxPath, {
      code: "xml_parse_failed",
      message: error instanceof Error ? error.message : "Unable to parse word/document.xml",
    });
  }

  const documentEntry = parsed.find((entry) => entryLocalName(entry) === "document");
  const bodyEntry = documentEntry ? firstDescendant(documentEntry, "body") : undefined;
  if (!bodyEntry) {
    return emptyExtraction(options.docxPath, {
      code: "missing_document_body",
      message: "word/document.xml does not contain w:body",
    });
  }

  return extractFromBody(bodyEntry, options.docxPath);
}

function extractFromBody(bodyEntry: XmlEntry, docxPath?: string): DocxObjectExtraction {
  const paragraphs: ExtractedDocxParagraph[] = [];
  const tables: ExtractedDocxTable[] = [];
  const drawings: ExtractedDocxDrawing[] = [];
  const captionCandidates: ExtractedCaptionCandidate[] = [];
  let paragraphIndex = 0;

  for (const [bodyIndex, child] of entryChildren(bodyEntry).entries()) {
    const localName = entryLocalName(child);
    if (localName === "p") {
      const text = normalizeText(extractText(child));
      const styleName = parseStyleName(child);
      paragraphs.push({ bodyIndex, paragraphIndex, text, styleName });

      for (const [drawingIndex, drawing] of descendants(child, "drawing").entries()) {
        drawings.push(parseDrawing(drawing, bodyIndex, paragraphIndex, drawingIndex));
      }

      const caption = parseCaptionCandidate({ bodyIndex, paragraphIndex, text, styleName });
      if (caption) captionCandidates.push(caption);
      paragraphIndex += 1;
      continue;
    }

    if (localName === "tbl") {
      tables.push(parseTable(child, bodyIndex, paragraphIndex, tables.length));
    }
  }

  return {
    docxPath,
    stats: {
      paragraphCount: paragraphs.length,
      tableCount: tables.length,
      drawingCount: drawings.length,
      captionCandidateCount: captionCandidates.length,
    },
    paragraphs,
    tables,
    drawings,
    captionCandidates,
    adjacentTablePairs: buildAdjacentTablePairs(tables, paragraphs, captionCandidates),
    warnings: [],
  };
}

function parseTable(table: XmlEntry, bodyIndex: number, paragraphIndex: number, tableIndex: number): ExtractedDocxTable {
  const rows = directChildren(table, "tr");
  const firstRow = rows[0];
  const firstRowCells = firstRow ? directChildren(firstRow, "tc") : [];
  const firstRowText = firstRowCells.map((cell) => normalizeText(extractText(cell)));
  const tblPr = directChildren(table, "tblPr")[0];
  const tblLook = tblPr ? directChildren(tblPr, "tblLook")[0] : undefined;
  const firstRowPr = firstRow ? directChildren(firstRow, "trPr")[0] : undefined;
  const headerRowCount = rows.filter(hasTableHeader).length;
  const columnCount = firstRowCells.length;
  const headerRowTextHash = hashCells(firstRowText);

  return {
    objectId: `table:${tableIndex}`,
    bodyIndex,
    startParagraphIndex: paragraphIndex,
    endParagraphIndex: paragraphIndex,
    rowCount: rows.length,
    columnCount,
    headerRowCount,
    hasTblHeaderInFirstRow: Boolean(firstRow && hasTableHeader(firstRow)),
    tblLookAttributes: tblLook ? entryAttrs(tblLook) : {},
    firstRowText,
    headerRowTextHash,
    schemaFingerprint: `${columnCount}:${headerRowTextHash}`,
  };
}

function hasTableHeader(row: XmlEntry): boolean {
  const rowPr = directChildren(row, "trPr")[0];
  return Boolean(rowPr && directChildren(rowPr, "tblHeader").length > 0);
}

function parseDrawing(
  drawing: XmlEntry,
  bodyIndex: number,
  anchorParagraphIndex: number,
  drawingIndex: number,
): ExtractedDocxDrawing {
  const inline = firstDescendant(drawing, "inline");
  const anchor = firstDescendant(drawing, "anchor");
  const blip = firstDescendant(drawing, "blip");
  const blipAttrs = blip ? entryAttrs(blip) : {};
  const relationshipId = attrValue(blipAttrs, "embed") || attrValue(blipAttrs, "link");

  return {
    objectId: `figure:${anchorParagraphIndex}:${drawingIndex}`,
    bodyIndex,
    anchorParagraphIndex,
    wrapMode: inline ? "inline" : findWrapMode(drawing),
    relationshipId,
    isInline: Boolean(inline && !anchor),
  };
}

function parseCaptionCandidate(input: {
  bodyIndex: number;
  paragraphIndex: number;
  text: string;
  styleName: string;
}): ExtractedCaptionCandidate | null {
  const { bodyIndex, paragraphIndex, text, styleName } = input;
  if (!text) return null;

  const continuationMatch = text.match(CONTINUATION_CAPTION_RE);
  if (continuationMatch) {
    return {
      objectId: `caption:table:${paragraphIndex}`,
      bodyIndex,
      paragraphIndex,
      text,
      styleName,
      matchedPattern: "continuation",
      captionKind: "table",
      numberToken: continuationMatch[0],
      isContinuation: true,
    };
  }

  const figureMatch = text.match(FIGURE_CAPTION_RE);
  if (figureMatch) {
    return {
      objectId: `caption:figure:${paragraphIndex}`,
      bodyIndex,
      paragraphIndex,
      text,
      styleName,
      matchedPattern: "figure",
      captionKind: "figure",
      numberToken: figureMatch[2] ?? "",
      isContinuation: false,
    };
  }

  const tableMatch = text.match(TABLE_CAPTION_RE);
  if (tableMatch) {
    return {
      objectId: `caption:table:${paragraphIndex}`,
      bodyIndex,
      paragraphIndex,
      text,
      styleName,
      matchedPattern: "table",
      captionKind: "table",
      numberToken: tableMatch[2] ?? "",
      isContinuation: false,
    };
  }

  return null;
}

function buildAdjacentTablePairs(
  tables: ExtractedDocxTable[],
  paragraphs: ExtractedDocxParagraph[],
  captions: ExtractedCaptionCandidate[],
): ExtractedAdjacentTablePair[] {
  return tables.slice(1).map((current, index) => {
    const previous = tables[index];
    const paragraphsBetween = paragraphs
      .filter((paragraph) => paragraph.bodyIndex > previous.bodyIndex && paragraph.bodyIndex < current.bodyIndex)
      .map(({ paragraphIndex, text }) => ({ paragraphIndex, text }));
    const betweenParagraphIndexes = new Set(paragraphsBetween.map((paragraph) => paragraph.paragraphIndex));

    return {
      prevTableObjectId: previous.objectId,
      currTableObjectId: current.objectId,
      prevTableIndex: index,
      currTableIndex: index + 1,
      paragraphsBetween,
      captionsBetween: captions.filter((caption) => betweenParagraphIndexes.has(caption.paragraphIndex)),
    };
  });
}

function emptyExtraction(docxPath: string | undefined, warning: DocxObjectExtractionWarning): DocxObjectExtraction {
  return {
    docxPath,
    stats: {
      paragraphCount: 0,
      tableCount: 0,
      drawingCount: 0,
      captionCandidateCount: 0,
    },
    paragraphs: [],
    tables: [],
    drawings: [],
    captionCandidates: [],
    adjacentTablePairs: [],
    warnings: [warning],
  };
}

function localName(name: string): string {
  return name.includes(":") ? name.slice(name.indexOf(":") + 1) : name;
}

function entryLocalName(entry: XmlEntry): string | null {
  const name = Object.keys(entry).find((key) => key !== ATTR_KEY);
  return name ? localName(name) : null;
}

function entryChildren(entry: XmlEntry): XmlEntry[] {
  const name = Object.keys(entry).find((key) => key !== ATTR_KEY);
  if (!name) return [];
  const value = entry[name];
  return Array.isArray(value) ? (value as XmlEntry[]) : [];
}

function entryAttrs(entry: XmlEntry): Record<string, string> {
  const rawAttrs = entry[ATTR_KEY];
  if (!rawAttrs || typeof rawAttrs !== "object" || Array.isArray(rawAttrs)) return {};
  return Object.fromEntries(
    Object.entries(rawAttrs as Record<string, unknown>).map(([key, value]) => [key, String(value)]),
  );
}

function attrValue(attrs: Record<string, string>, name: string): string {
  return attrs[name] ?? attrs[`w:${name}`] ?? attrs[`r:${name}`] ?? attrs[`wp:${name}`] ?? "";
}

function directChildren(entry: XmlEntry, wantedLocalName: string): XmlEntry[] {
  return entryChildren(entry).filter((child) => entryLocalName(child) === wantedLocalName);
}

function descendants(entry: XmlEntry, wantedLocalName: string): XmlEntry[] {
  const matches: XmlEntry[] = [];
  const walk = (node: XmlEntry) => {
    if (entryLocalName(node) === wantedLocalName) matches.push(node);
    for (const child of entryChildren(node)) walk(child);
  };
  walk(entry);
  return matches;
}

function firstDescendant(entry: XmlEntry, wantedLocalName: string): XmlEntry | undefined {
  return descendants(entry, wantedLocalName)[0];
}

function findWrapMode(drawing: XmlEntry): DrawingWrapMode {
  const found = findFirstByPredicate(drawing, (child) => {
    const name = entryLocalName(child);
    return Boolean(name && name.startsWith("wrap"));
  });
  const mode = found ? entryLocalName(found) : null;
  if (isDrawingWrapMode(mode)) return mode;
  return "floating";
}

function isDrawingWrapMode(mode: string | null): mode is DrawingWrapMode {
  return Boolean(
    mode
      && ["inline", "wrapNone", "wrapSquare", "wrapTight", "wrapThrough", "wrapTopAndBottom", "floating", "unknown"].includes(mode),
  );
}

function findFirstByPredicate(entry: XmlEntry, predicate: (entry: XmlEntry) => boolean): XmlEntry | undefined {
  if (predicate(entry)) return entry;
  for (const child of entryChildren(entry)) {
    const found = findFirstByPredicate(child, predicate);
    if (found) return found;
  }
  return undefined;
}

function extractText(entry: XmlEntry): string {
  const name = Object.keys(entry).find((key) => key !== ATTR_KEY);
  if (!name) return "";
  const value = entry[name];
  if (name === "#text") return typeof value === "string" ? value : "";
  if (!Array.isArray(value)) return "";
  return (value as XmlEntry[]).map(extractText).join("");
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function parseStyleName(paragraph: XmlEntry): string {
  const pPr = directChildren(paragraph, "pPr")[0];
  if (!pPr) return "";
  const pStyle = directChildren(pPr, "pStyle")[0];
  if (!pStyle) return "";
  return attrValue(entryAttrs(pStyle), "val");
}

function hashCells(cells: string[]): string {
  return crypto
    .createHash("sha1")
    .update(cells.map((cell) => cell.trim()).join("|"))
    .digest("hex");
}
