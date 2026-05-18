export const TABLE_CONTINUATION_RULE_ID = "TABLE_CONTINUATION_REVIEW";
export const TABLE_CONTINUATION_LABEL = "续表关系确认";
export function detectTableContinuation(graph) {
    const tableById = new Map(graph.nodes
        .filter(isTableObject)
        .map((table) => [table.objectId, table]));
    return graph.edges
        .filter(isContinuesEdge)
        .filter((edge) => edge.vote.decision === "edge_with_warning")
        .map((edge) => createDetection(edge, tableById));
}
function createDetection(edge, tableById) {
    const continuationTable = tableById.get(edge.fromObjectId);
    const mainTable = tableById.get(edge.toObjectId);
    const paragraphIndex = continuationTable?.startParagraphIndex ?? mainTable?.startParagraphIndex ?? 0;
    const captionsBetween = edge.evidence?.captionsBetween || [];
    const before = `${edge.toObjectId} <- ${edge.fromObjectId}`;
    const signalText = edge.vote.signals.join(" / ") || "无结构信号";
    const snippet = captionsBetween[0]
        || continuationTable?.firstRowText.filter(Boolean).join(" / ").slice(0, 180)
        || "续表关系需要人工确认。";
    return {
        ruleId: TABLE_CONTINUATION_RULE_ID,
        label: TABLE_CONTINUATION_LABEL,
        group: "图表 & 题注",
        severity: "P2",
        confidence: edge.confidence,
        page: continuationTable?.page ?? Math.max(1, Math.floor(paragraphIndex / 8) + 1),
        snippet,
        evidence: {
            paragraphIndex,
            objectName: edge.fromObjectId,
            anchor: {
                relationId: edge.edgeId,
                fromObjectId: edge.fromObjectId,
                toObjectId: edge.toObjectId,
                relationType: "continues_ambiguous",
                captionKind: "table",
            },
        },
        suggestion: {
            type: "manual_review",
            before,
            after: "确认该表是否为上一表的续表，并保持表头、表号与标题连续",
            explanation: `续表投票分数为 ${edge.vote.score}，命中信号：${signalText}。建议人工确认该表是否应作为上一表的延续。`,
        },
    };
}
function isContinuesEdge(edge) {
    return edge.edgeType === "continues";
}
function isTableObject(node) {
    return node.kind === "table";
}
