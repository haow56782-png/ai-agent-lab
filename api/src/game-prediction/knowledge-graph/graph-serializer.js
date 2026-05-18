/** ============================================================
 *  Graph Serializer — JSON export/import for KnowledgeGraph.
 *
 *  Provides deterministic serialization (sorted keys, no random
 *  fields) so that export → deserialize → re-import preserves
 *  the full graph structure, enabling persistence and recovery.
 *  ============================================================ */
export class JSONGraphSerializer {
    /**
     * Serialize a KnowledgeGraph to a JSON string.
     * Sorts keys deterministically for reproducible output.
     */
    serialize(graph) {
        const sorted = sortGraph(graph);
        return JSON.stringify(sorted, null, 2);
    }
    /**
     * Deserialize a JSON string back into a KnowledgeGraph.
     */
    deserialize(data) {
        const parsed = JSON.parse(data);
        validateGraph(parsed);
        return parsed;
    }
}
/**
 * Deterministic sort: nodes by id, edges by id, metadata keys sorted.
 */
function sortGraph(graph) {
    const sortedNodes = [...graph.nodes].sort((a, b) => a.id.localeCompare(b.id));
    const sortedEdges = [...graph.edges].sort((a, b) => a.id.localeCompare(b.id));
    return {
        nodes: sortedNodes,
        edges: sortedEdges,
        metadata: {
            playerId: graph.metadata.playerId,
            nodeCount: sortedNodes.length,
            edgeCount: sortedEdges.length,
            builtAt: graph.metadata.builtAt,
            sourceSummary: { ...graph.metadata.sourceSummary },
        },
        warnings: [...graph.warnings].sort(),
    };
}
function validateGraph(parsed) {
    if (!parsed || typeof parsed !== "object") {
        throw new Error("Invalid KnowledgeGraph: not an object");
    }
    const g = parsed;
    if (!Array.isArray(g.nodes))
        throw new Error("Invalid KnowledgeGraph: nodes must be an array");
    if (!Array.isArray(g.edges))
        throw new Error("Invalid KnowledgeGraph: edges must be an array");
    if (!g.metadata || typeof g.metadata !== "object") {
        throw new Error("Invalid KnowledgeGraph: metadata required");
    }
    if (!Array.isArray(g.warnings)) {
        throw new Error("Invalid KnowledgeGraph: warnings must be an array");
    }
}
//# sourceMappingURL=graph-serializer.js.map