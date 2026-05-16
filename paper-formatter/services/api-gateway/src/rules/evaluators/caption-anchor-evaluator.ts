import type { CafaDocumentObject } from "../../fixtures/cafa-types.js";
import type { ParsedDocumentContext } from "../rule-types.js";

export type CaptionKind = "figure" | "table";

export type CaptionAnchorRelationType =
  | "caption_belongs_to_figure"
  | "caption_belongs_to_table"
  | "caption_wrong_position"
  | "caption_unbound";

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

function normalizeText(value: string | undefined): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function isBodyReference(text: string, prefix: "图" | "表"): boolean {
  const compact = normalizeText(text);
  return compact.startsWith(`如${prefix}`) || compact.startsWith(`见${prefix}`);
}

export function detectCaptionKind(text: string | undefined): CaptionKind | null {
  const compact = normalizeText(text);
  if (!compact) return null;
  if ((/^图\s*\d/.test(compact) || /^Figure\s*\d/i.test(compact)) && !isBodyReference(compact, "图")) {
    return "figure";
  }
  if ((/^表\s*\d/.test(compact) || /^续表\s*\d/.test(compact) || /^Table\s*\d/i.test(compact)) && !isBodyReference(compact, "表")) {
    return "table";
  }
  return null;
}

function objectTop(object: Pick<CaptionAnchorObject, "position">): number | null {
  const top = object.position?.top;
  return typeof top === "number" ? top : null;
}

function objectBottom(object: Pick<CaptionAnchorObject, "position">): number | null {
  const bottom = object.position?.bottom;
  if (typeof bottom === "number") return bottom;
  return objectTop(object);
}

function objectLeft(object: Pick<CaptionAnchorObject, "position">): number | null {
  const left = object.position?.left;
  return typeof left === "number" ? left : null;
}

function objectRight(object: Pick<CaptionAnchorObject, "position">): number | null {
  const right = object.position?.right;
  if (typeof right === "number") return right;
  return objectLeft(object);
}

function verticalDistance(a: CaptionAnchorObject, b: CaptionAnchorObject): number | null {
  const topA = objectTop(a);
  const bottomA = objectBottom(a);
  const topB = objectTop(b);
  const bottomB = objectBottom(b);
  if (topA === null || bottomA === null || topB === null || bottomB === null) return null;
  const centerA = (topA + bottomA) / 2;
  const centerB = (topB + bottomB) / 2;
  return Math.abs(centerA - centerB);
}

function horizontalDistance(a: CaptionAnchorObject, b: CaptionAnchorObject): number | null {
  const leftA = objectLeft(a);
  const rightA = objectRight(a);
  const leftB = objectLeft(b);
  const rightB = objectRight(b);
  if (leftA === null || rightA === null || leftB === null || rightB === null) return null;
  const centerA = (leftA + rightA) / 2;
  const centerB = (leftB + rightB) / 2;
  return Math.abs(centerA - centerB);
}

function anchorDistance(a: CaptionAnchorObject, b: CaptionAnchorObject): number | null {
  const vertical = verticalDistance(a, b);
  const horizontal = horizontalDistance(a, b);
  if (vertical === null && horizontal === null) return null;
  return (vertical ?? 0) + (horizontal ?? 0) * 0.35;
}

function flowDistance(a: CaptionAnchorObject, b: CaptionAnchorObject): number | null {
  if (typeof a.flowOrder !== "number" || typeof b.flowOrder !== "number") return null;
  return Math.abs(a.flowOrder - b.flowOrder) * 100;
}

function paragraphDistance(a: CaptionAnchorObject, b: CaptionAnchorObject): number | null {
  if (typeof a.paragraphIndex !== "number" || typeof b.paragraphIndex !== "number") return null;
  return Math.abs(a.paragraphIndex - b.paragraphIndex) * 100;
}

function samePageBoost(caption: CaptionAnchorObject, target: CaptionAnchorObject): number {
  if (caption.page === undefined || target.page === undefined) return 0;
  return caption.page === target.page ? 0 : 10_000;
}

function relationPriority(caption: CaptionAnchorObject, target: CaptionAnchorObject): number {
  return samePageBoost(caption, target)
    + (anchorDistance(target, caption) ?? flowDistance(target, caption) ?? paragraphDistance(target, caption) ?? 50_000);
}

function isPreferredDirectionalMatch(caption: CaptionAnchorObject, target: CaptionAnchorObject, kind: CaptionKind): boolean {
  const captionTop = objectTop(caption);
  const captionBottom = objectBottom(caption);
  const targetTop = objectTop(target);
  const targetBottom = objectBottom(target);
  if (kind === "figure") {
    if (captionTop !== null && targetBottom !== null) return targetBottom <= captionTop;
    if (typeof caption.flowOrder === "number" && typeof target.flowOrder === "number") return target.flowOrder < caption.flowOrder;
    return caption.prevFlowKind === "paragraph";
  }
  if (captionBottom !== null && targetTop !== null) return targetTop >= captionBottom;
  if (typeof caption.flowOrder === "number" && typeof target.flowOrder === "number") return target.flowOrder > caption.flowOrder;
  return caption.nextFlowKind === "table";
}

function resolveFlowDirectionalCandidates(
  caption: CaptionAnchorObject,
  kind: CaptionKind,
  candidates: CaptionAnchorObject[],
): CaptionAnchorObject[] {
  if (kind === "table" && caption.prevFlowKind === "table" && typeof caption.flowOrder === "number") {
    const captionFlowOrder = caption.flowOrder;
    const previousTables = candidates.filter((candidate) => typeof candidate.flowOrder === "number" && candidate.flowOrder < captionFlowOrder);
    if (previousTables.length > 0) return previousTables;
  }
  const directionalCandidates = candidates.filter((candidate) => isPreferredDirectionalMatch(caption, candidate, kind));
  return directionalCandidates.length > 0 ? directionalCandidates : candidates;
}

function resolveRelationType(caption: CaptionAnchorObject, target: CaptionAnchorObject, kind: CaptionKind): CaptionAnchorRelationType {
  const captionTop = objectTop(caption);
  const captionBottom = objectBottom(caption);
  const targetTop = objectTop(target);
  const targetBottom = objectBottom(target);
  if (kind === "figure") {
    if (captionTop !== null && targetBottom !== null) {
      return captionTop >= targetBottom ? "caption_belongs_to_figure" : "caption_wrong_position";
    }
    if (typeof caption.flowOrder === "number" && typeof target.flowOrder === "number") {
      return caption.flowOrder > target.flowOrder ? "caption_belongs_to_figure" : "caption_wrong_position";
    }
    return caption.prevFlowKind === "paragraph" && caption.nextFlowKind === "paragraph"
      ? "caption_belongs_to_figure"
      : "caption_wrong_position";
  }
  if (captionBottom !== null && targetTop !== null) {
    return captionBottom <= targetTop ? "caption_belongs_to_table" : "caption_wrong_position";
  }
  if (typeof caption.flowOrder === "number" && typeof target.flowOrder === "number") {
    return caption.flowOrder < target.flowOrder ? "caption_belongs_to_table" : "caption_wrong_position";
  }
  return caption.nextFlowKind === "table" ? "caption_belongs_to_table" : "caption_wrong_position";
}

export function evaluateCaptionAnchors(objects: CaptionAnchorObject[]): CaptionAnchorRelation[] {
  const relations: CaptionAnchorRelation[] = [];
  const captions = objects.filter((object) => object.type === "paragraph" && detectCaptionKind(object.text));
  for (const caption of captions) {
    const kind = detectCaptionKind(caption.text);
    if (!kind) continue;
    const targetType = kind === "figure" ? "figure" : "table";
    const orderedCandidates = objects
      .filter((object) => object.type === targetType)
      .sort((left, right) => relationPriority(caption, left) - relationPriority(caption, right));
    const hasGeometryAnchors = orderedCandidates.some((candidate) => anchorDistance(candidate, caption) !== null);
    const candidates = hasGeometryAnchors
      ? orderedCandidates
      : resolveFlowDirectionalCandidates(caption, kind, orderedCandidates);
    if (candidates.length === 0) {
      relations.push({
        relationId: `${caption.objectId}->unbound`,
        fromObjectId: caption.objectId,
        toObjectId: "",
        relationType: "caption_unbound",
        captionKind: kind,
      });
      continue;
    }
    const target = candidates[0];
    relations.push({
      relationId: `${caption.objectId}->${target.objectId}`,
      fromObjectId: caption.objectId,
      toObjectId: target.objectId,
      relationType: resolveRelationType(caption, target, kind),
      captionKind: kind,
    });
  }
  return relations;
}

function estimatePage(indexLike: number | undefined): number | undefined {
  if (typeof indexLike !== "number" || Number.isNaN(indexLike)) return undefined;
  return Math.max(1, Math.floor(indexLike / 8) + 1);
}

export function buildCaptionAnchorObjectsFromFixture(objects: CafaDocumentObject[]): CaptionAnchorObject[] {
  return objects.map((object) => ({
    objectId: object.objectId,
    type: object.type,
    page: object.page,
    text: object.text,
    position: object.position,
    alignment: typeof object.style?.align === "string" ? object.style.align : undefined,
  }));
}

export function buildCaptionAnchorObjectsFromParsedContext(ctx: ParsedDocumentContext): CaptionAnchorObject[] {
  const paragraphMap = new Map((ctx.paragraphs || []).map((paragraph: any) => [Number(paragraph?.index ?? -1), paragraph]));

  const captionObjects: CaptionAnchorObject[] = (ctx.structureItems || [])
    .filter((item: any) => item?.type === "figure_caption" || item?.type === "table_caption")
    .map((item: any) => {
      const paragraphIndex = Number(item?.index ?? -1);
      const paragraph = paragraphMap.get(paragraphIndex);
      return {
        objectId: `caption:${item.type}:${paragraphIndex}`,
        type: "paragraph",
        page: estimatePage(paragraphIndex),
        text: String(item?.text || paragraph?.text || ""),
        flowOrder: Number(paragraph?.flow_order ?? item?.flow_order),
        paragraphIndex,
        alignment: paragraph?.alignment,
        prevFlowKind: paragraph?.prev_flow_kind ?? null,
        nextFlowKind: paragraph?.next_flow_kind ?? null,
      };
    });

  const figureObjects: CaptionAnchorObject[] = (ctx.images || []).map((image: any, index: number) => {
    const paragraphIndex = typeof image?.paragraph_index === "number" ? image.paragraph_index : undefined;
    return {
      objectId: `figure:${paragraphIndex ?? index}:${index}`,
      type: "figure",
      page: estimatePage(paragraphIndex),
      flowOrder: typeof image?.flow_order === "number" ? image.flow_order : paragraphIndex,
      paragraphIndex,
    };
  });

  const tableObjects: CaptionAnchorObject[] = (ctx.tables || []).map((table: any, index: number) => ({
    objectId: `table:${Number(table?.index ?? index)}`,
    type: "table",
    page: estimatePage(typeof table?.flow_order === "number" ? table.flow_order : undefined),
    flowOrder: typeof table?.flow_order === "number" ? table.flow_order : undefined,
    paragraphIndex: typeof table?.index === "number" ? table.index : undefined,
  }));

  return [...captionObjects, ...figureObjects, ...tableObjects];
}
