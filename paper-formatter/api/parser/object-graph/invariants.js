export function lintObjectGraphInvariants(graph) {
    const warnings = [];
    const nodeById = buildNodeIndex(graph.nodes, warnings);
    for (const edge of graph.edges) {
        warnings.push(...lintEdgeReferences(edge, nodeById));
        if (isCaptionedByEdge(edge)) {
            warnings.push(...lintCaptionAnchorMonotonicity(edge, nodeById));
        }
        if (isContinuesEdge(edge)) {
            warnings.push(...lintContinuationSchema(edge, nodeById));
        }
    }
    return warnings;
}
function buildNodeIndex(nodes, warnings) {
    const nodeById = new Map();
    for (const node of nodes) {
        if (nodeById.has(node.objectId)) {
            warnings.push(invariantWarning({
                message: `ObjectGraph contains duplicate node id ${node.objectId}.`,
                nodeIds: [node.objectId],
            }));
            continue;
        }
        nodeById.set(node.objectId, node);
    }
    return nodeById;
}
function lintEdgeReferences(edge, nodeById) {
    const warnings = [];
    if (!nodeById.has(edge.fromObjectId)) {
        warnings.push(invariantWarning({
            message: `ObjectGraph edge ${edge.edgeId} references missing fromObjectId ${edge.fromObjectId}.`,
            nodeIds: [edge.fromObjectId],
            edgeIds: [edge.edgeId],
        }));
    }
    const toObjectId = edgeToObjectId(edge);
    if (toObjectId && !nodeById.has(toObjectId)) {
        warnings.push(invariantWarning({
            message: `ObjectGraph edge ${edge.edgeId} references missing toObjectId ${toObjectId}.`,
            nodeIds: [toObjectId],
            edgeIds: [edge.edgeId],
        }));
    }
    return warnings;
}
function lintCaptionAnchorMonotonicity(edge, nodeById) {
    const target = nodeById.get(edge.fromObjectId);
    const caption = nodeById.get(edge.toObjectId);
    if (!target || !isCaptionNode(caption))
        return [];
    if (edge.captionKind === "figure") {
        if (!isFigureObject(target)) {
            return [invariantWarning({
                    message: `Figure caption edge ${edge.edgeId} points to non-figure node ${target.objectId}.`,
                    nodeIds: [target.objectId, caption.objectId],
                    edgeIds: [edge.edgeId],
                })];
        }
        if (caption.paragraphIndex <= target.anchorParagraphIndex) {
            return [invariantWarning({
                    message: `Figure caption ${caption.objectId} must appear after figure ${target.objectId}.`,
                    nodeIds: [target.objectId, caption.objectId],
                    edgeIds: [edge.edgeId],
                })];
        }
        return [];
    }
    if (!isTableObject(target)) {
        return [invariantWarning({
                message: `Table caption edge ${edge.edgeId} points to non-table node ${target.objectId}.`,
                nodeIds: [target.objectId, caption.objectId],
                edgeIds: [edge.edgeId],
            })];
    }
    if (caption.paragraphIndex >= target.startParagraphIndex) {
        return [invariantWarning({
                message: `Table caption ${caption.objectId} must appear before table ${target.objectId}.`,
                nodeIds: [target.objectId, caption.objectId],
                edgeIds: [edge.edgeId],
            })];
    }
    return [];
}
function lintContinuationSchema(edge, nodeById) {
    const continuation = nodeById.get(edge.fromObjectId);
    const main = nodeById.get(edge.toObjectId);
    if (!isTableObject(continuation) || !isTableObject(main)) {
        return [invariantWarning({
                message: `Continuation edge ${edge.edgeId} must connect table nodes.`,
                nodeIds: [edge.fromObjectId, edge.toObjectId],
                edgeIds: [edge.edgeId],
            })];
    }
    if (continuation.schemaFingerprint !== main.schemaFingerprint) {
        return [invariantWarning({
                message: `Continuation edge ${edge.edgeId} links tables with different schema fingerprints.`,
                nodeIds: [continuation.objectId, main.objectId],
                edgeIds: [edge.edgeId],
            })];
    }
    return [];
}
function edgeToObjectId(edge) {
    return "toObjectId" in edge ? edge.toObjectId : undefined;
}
function invariantWarning(input) {
    return {
        code: "invariant_violation",
        message: input.message,
        nodeIds: input.nodeIds,
        edgeIds: input.edgeIds,
        disposition: "warning",
    };
}
function isCaptionedByEdge(edge) {
    return edge.edgeType === "captioned_by";
}
function isContinuesEdge(edge) {
    return edge.edgeType === "continues";
}
function isCaptionNode(node) {
    return node?.kind === "caption";
}
function isFigureObject(node) {
    return node?.kind === "figure";
}
function isTableObject(node) {
    return node?.kind === "table";
}
