import { FIGURE_CAPTION_POSITION_LABEL, FIGURE_CAPTION_POSITION_RULE_ID, TABLE_CAPTION_POSITION_LABEL, TABLE_CAPTION_POSITION_RULE_ID, } from "./caption-position.detector.js";
const GROUP = "图表 & 题注";
export const FIGURE_CAPTION_POSITION_V2_RULE_ID = "CAPTION_POSITION_OBJECT_GRAPH_REVIEW";
export function detectCaptionPositionV2(graph) {
    const nodeById = new Map(graph.nodes.map((node) => [node.objectId, node]));
    const captionedByEdges = graph.edges.filter(isCaptionedByEdge);
    const captionIdsWithEdges = new Set(captionedByEdges.map((edge) => edge.toObjectId));
    const detections = [];
    for (const edge of captionedByEdges) {
        const target = nodeById.get(edge.fromObjectId);
        const caption = nodeById.get(edge.toObjectId);
        if (!target || !isCaptionNode(caption))
            continue;
        const relationType = resolveCaptionRelationType(caption, target);
        if (relationType !== "caption_wrong_position")
            continue;
        detections.push(createDetection({ caption, target, relationId: edge.edgeId, relationType, confidence: edge.confidence }));
    }
    for (const caption of graph.nodes.filter(isCaptionNode)) {
        if (captionIdsWithEdges.has(caption.objectId))
            continue;
        detections.push(createDetection({
            caption,
            target: null,
            relationId: `${caption.objectId}->unbound`,
            relationType: "caption_unbound",
            confidence: 0.65,
        }));
    }
    return detections;
}
function createDetection(input) {
    const isFigure = input.caption.captionKind === "figure";
    const label = isFigure ? FIGURE_CAPTION_POSITION_LABEL : TABLE_CAPTION_POSITION_LABEL;
    const ruleId = isFigure ? FIGURE_CAPTION_POSITION_RULE_ID : TABLE_CAPTION_POSITION_RULE_ID;
    const explanation = input.relationType === "caption_unbound"
        ? `${isFigure ? "图题" : "表题"}未能绑定到真实${isFigure ? "图片" : "表格"}对象，建议人工确认对象锚点。`
        : isFigure
            ? "检测到图题位于图片之前，建议按模板放在图片下方并居中。"
            : "检测到表题位于表格之后，建议按模板放在表格上方。";
    return {
        ruleId,
        label,
        group: GROUP,
        severity: "P2",
        confidence: input.confidence,
        page: input.caption.page ?? Math.max(1, Math.floor(input.caption.paragraphIndex / 8) + 1),
        snippet: input.caption.text.slice(0, 180) || `${label}需要人工复核。`,
        evidence: {
            paragraphIndex: input.caption.paragraphIndex,
            anchor: {
                relationId: input.relationId,
                fromObjectId: input.caption.objectId,
                toObjectId: input.target?.objectId ?? "",
                relationType: input.relationType,
                captionKind: input.caption.captionKind,
            },
        },
        suggestion: {
            type: "restructure",
            before: input.caption.text,
            after: `按模板统一${label}`,
            explanation,
        },
    };
}
function resolveCaptionRelationType(caption, target) {
    if (caption.captionKind === "figure") {
        if (!isFigureObject(target))
            return "caption_wrong_position";
        return caption.paragraphIndex > target.anchorParagraphIndex
            ? "caption_belongs_to_figure"
            : "caption_wrong_position";
    }
    if (!isTableObject(target))
        return "caption_wrong_position";
    return caption.paragraphIndex < target.startParagraphIndex
        ? "caption_belongs_to_table"
        : "caption_wrong_position";
}
function isCaptionedByEdge(edge) {
    return edge.edgeType === "captioned_by";
}
function isCaptionNode(node) {
    return Boolean(node && node.kind === "caption");
}
function isFigureObject(node) {
    return node.kind === "figure";
}
function isTableObject(node) {
    return node.kind === "table";
}
