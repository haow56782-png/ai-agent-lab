/** ============================================================
 *  InMemoryGraphStore — Volatile in-memory graph store.
 *
 *  Stores nodes in a Map<string, GraphNode> and edges in a
 *  Map<string, GraphEdge> with a secondary adjacency index for
 *  efficient edge lookups by node.
 *
 *  Supports all query types via delegation to graph-query.ts.
 *  Export returns a complete KnowledgeGraph snapshot.
 *  ============================================================ */
import { executeGraphQuery } from "./graph-query.js";
export class InMemoryGraphStore {
    nodes = new Map();
    edges = new Map();
    adjacency = new Map(); // nodeId → edgeIds
    async addNode(node) {
        const existing = this.nodes.get(node.id);
        if (existing) {
            // Merge properties, keep latest timestamp
            this.nodes.set(node.id, {
                ...node,
                properties: { ...existing.properties, ...node.properties },
                updatedAt: node.updatedAt,
            });
            return;
        }
        this.nodes.set(node.id, { ...node });
    }
    async addEdge(edge) {
        if (this.edges.has(edge.id)) {
            // Merge properties on duplicate edge
            const existing = this.edges.get(edge.id);
            this.edges.set(edge.id, {
                ...edge,
                properties: { ...existing.properties, ...edge.properties },
            });
            return;
        }
        this.edges.set(edge.id, { ...edge });
        // Index adjacency
        for (const nodeId of [edge.sourceId, edge.targetId]) {
            if (!this.adjacency.has(nodeId)) {
                this.adjacency.set(nodeId, new Set());
            }
            this.adjacency.get(nodeId).add(edge.id);
        }
    }
    async getNode(id) {
        return this.nodes.get(id) ?? null;
    }
    async getEdgesForNode(id) {
        const edgeIds = this.adjacency.get(id);
        if (!edgeIds)
            return [];
        const result = [];
        for (const eid of edgeIds) {
            const edge = this.edges.get(eid);
            if (edge)
                result.push(edge);
        }
        return result;
    }
    async query(query) {
        return executeGraphQuery(this, query);
    }
    async exportGraph() {
        const nodes = [...this.nodes.values()];
        const edges = [...this.edges.values()];
        const playerId = nodes.find((n) => n.type === "PLAYER")?.id ?? "unknown";
        return {
            nodes,
            edges,
            metadata: {
                playerId,
                nodeCount: nodes.length,
                edgeCount: edges.length,
                builtAt: new Date().toISOString(),
                sourceSummary: {
                    memoryEvents: 0,
                    decisionOutputs: 0,
                    behaviorOutputs: 0,
                    learningOutputs: 0,
                    debateOutputs: 0,
                    simulationOutputs: 0,
                },
            },
            warnings: [],
        };
    }
    async clear() {
        this.nodes.clear();
        this.edges.clear();
        this.adjacency.clear();
    }
    /** Access for query engine — not part of the public interface. */
    _getAllNodes() {
        return this.nodes;
    }
    _getAllEdges() {
        return this.edges;
    }
}
//# sourceMappingURL=graph-store.js.map