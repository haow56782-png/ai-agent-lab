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
import type { GraphNode, GraphEdge, GraphStore, GraphQuery, GraphQueryResult, KnowledgeGraph } from "./types.js";
export declare class InMemoryGraphStore implements GraphStore {
    private nodes;
    private edges;
    private adjacency;
    addNode(node: GraphNode): Promise<void>;
    addEdge(edge: GraphEdge): Promise<void>;
    getNode(id: string): Promise<GraphNode | null>;
    getEdgesForNode(id: string): Promise<GraphEdge[]>;
    query(query: GraphQuery): Promise<GraphQueryResult>;
    exportGraph(): Promise<KnowledgeGraph>;
    clear(): Promise<void>;
    /** Access for query engine — not part of the public interface. */
    _getAllNodes(): Map<string, GraphNode>;
    _getAllEdges(): Map<string, GraphEdge>;
}
//# sourceMappingURL=graph-store.d.ts.map