import type { CafaDocumentObject } from "../../fixtures/cafa-types.js";
import type { ParsedDocumentContext } from "../rule-types.js";
export type CaptionKind = "figure" | "table";
export type CaptionAnchorRelationType = "caption_belongs_to_figure" | "caption_belongs_to_table" | "caption_wrong_position" | "caption_unbound";
export interface CaptionAnchorObject {
    objectId: string;
    type: "paragraph" | "figure" | "table";
    page?: number;
    text?: string;
    position?: Record<string, unknown>;
    flowOrder?: number;
    paragraphIndex?: number;
    alignment?: string;
    prevFlowKind?: string | null;
    nextFlowKind?: string | null;
}
export interface CaptionAnchorRelation {
    relationId: string;
    fromObjectId: string;
    toObjectId: string;
    relationType: CaptionAnchorRelationType;
    captionKind: CaptionKind;
}
export declare function detectCaptionKind(text: string | undefined): CaptionKind | null;
export declare function evaluateCaptionAnchors(objects: CaptionAnchorObject[]): CaptionAnchorRelation[];
export declare function buildCaptionAnchorObjectsFromFixture(objects: CafaDocumentObject[]): CaptionAnchorObject[];
export declare function buildCaptionAnchorObjectsFromParsedContext(ctx: ParsedDocumentContext): CaptionAnchorObject[];
