/**
 * L2 Object Graph IR contract for DOCX figure/table/caption relationships.
 * This file defines types only for PR #2; extraction, graph building,
 * invariant linting, and detector migration remain separate PR slices.
 * Fields are grounded in PR #1 probe outputs from real DOCX XML samples.
 */

export const OBJECT_GRAPH_SCHEMA_VERSION = "object-graph.v0.1" as const;

export const CONTINUATION_VOTE_THRESHOLDS = {
  confirmedEdge: 3,
  ambiguousEdge: 2,
} as const;

export type ObjectGraphSchemaVersion = typeof OBJECT_GRAPH_SCHEMA_VERSION;

export type ObjectGraphNodeKind = "figure" | "table" | "caption";

export type ObjectGraphEdgeType = "anchored_at" | "captioned_by" | "continues";

export type CaptionKind = "figure" | "table";

export type CaptionRole = "primary" | "continuation";

export type DrawingWrapMode =
  | "inline"
  | "wrapNone"
  | "wrapSquare"
  | "wrapTight"
  | "wrapThrough"
  | "wrapTopAndBottom"
  | "floating"
  | "unknown";

export type ContinuationSignal =
  | "tbl_header_match"
  | "schema_fingerprint_match"
  | "adjacent_no_caption"
  | "adjacent_no_body_text"
  | "caption_text_continuation";

export type ContinuationDecision = "edge" | "edge_with_warning" | "no_edge";

export type ObjectGraphWarningCode =
  | "parse_failed"
  | "unsupported_object"
  | "caption_unbound"
  | "continuation_ambiguous"
  | "invariant_violation";

export type InvariantViolationDisposition = "warning";

export interface ObjectGraph {
  schemaVersion: ObjectGraphSchemaVersion;
  documentId?: string;
  documentVersion?: string;
  source: ObjectGraphSource;
  nodes: ObjectGraphNode[];
  edges: ObjectGraphEdge[];
  paragraphIndex: ParagraphObjectGraphIndexEntry[];
  warnings: ObjectGraphWarning[];
}

export interface ObjectGraphSource {
  parser: "docx-xml";
  docxPath?: string;
  generatedAt: string;
  probeEvidence?: {
    tableCount: number;
    drawingCount: number;
    captionCandidateCount: number;
  };
}

export type ObjectGraphNode = FigureObject | TableObject | CaptionNode;

export interface ObjectGraphNodeBase {
  objectId: string;
  kind: ObjectGraphNodeKind;
  page?: number;
  paragraphIndex?: number;
  flowOrder?: number;
}

export interface FigureObject extends ObjectGraphNodeBase {
  kind: "figure";
  anchorParagraphIndex: number;
  isInline: boolean;
  wrapMode: DrawingWrapMode;
  relationshipId: string;
  objectName?: string;
}

export interface TableObject extends ObjectGraphNodeBase {
  kind: "table";
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

export interface CaptionNode extends ObjectGraphNodeBase {
  kind: "caption";
  paragraphIndex: number;
  captionKind: CaptionKind;
  role: CaptionRole;
  text: string;
  styleName: string;
  numberToken: string;
  isContinuation: boolean;
}

export type ObjectGraphEdge = AnchoredAtEdge | CaptionedByEdge | ContinuesEdge;

export interface ObjectGraphEdgeBase {
  edgeId: string;
  edgeType: ObjectGraphEdgeType;
  fromObjectId: string;
  confidence: number;
  evidence?: ObjectGraphEvidence;
}

export interface AnchoredAtEdge extends ObjectGraphEdgeBase {
  edgeType: "anchored_at";
  fromObjectId: string;
  anchorParagraphIndex: number;
  toObjectId?: never;
}

export interface CaptionedByEdge extends ObjectGraphEdgeBase {
  edgeType: "captioned_by";
  fromObjectId: string;
  toObjectId: string;
  captionKind: CaptionKind;
}

export interface ContinuesEdge extends ObjectGraphEdgeBase {
  edgeType: "continues";
  /**
   * Direction approved after PR #1: continuation table -> main table.
   */
  fromObjectId: string;
  toObjectId: string;
  vote: ContinuationVote;
}

export interface ContinuationVote {
  score: number;
  signals: ContinuationSignal[];
  decision: ContinuationDecision;
  warningCode?: Extract<ObjectGraphWarningCode, "continuation_ambiguous">;
}

export interface ObjectGraphEvidence {
  paragraphIndexes?: number[];
  captionsBetween?: string[];
  firstRowText?: string[];
  headerRowTextHash?: string;
  wrapMode?: DrawingWrapMode;
  relationshipId?: string;
}

export interface ParagraphObjectGraphIndexEntry {
  paragraphIndex: number;
  nodeIds: string[];
  edgeIds: string[];
}

export interface ObjectGraphWarning {
  code: ObjectGraphWarningCode;
  message: string;
  nodeIds?: string[];
  edgeIds?: string[];
  disposition: InvariantViolationDisposition;
}
