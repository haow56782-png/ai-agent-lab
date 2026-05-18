import type { CaptionKind, DrawingWrapMode } from "./object-graph/types.js";
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
    paragraphsBetween: Array<{
        paragraphIndex: number;
        text: string;
    }>;
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
export declare function extractDocxObjectsFromDocxPath(docxPath: string): Promise<DocxObjectExtraction>;
export declare function extractDocxObjectsFromDocxBuffer(buffer: Buffer, options?: {
    docxPath?: string;
}): Promise<DocxObjectExtraction>;
export declare function extractDocxObjectsFromDocumentXml(documentXml: string, options?: {
    docxPath?: string;
}): DocxObjectExtraction;
export {};
