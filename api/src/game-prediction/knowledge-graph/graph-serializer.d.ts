/** ============================================================
 *  Graph Serializer — JSON export/import for KnowledgeGraph.
 *
 *  Provides deterministic serialization (sorted keys, no random
 *  fields) so that export → deserialize → re-import preserves
 *  the full graph structure, enabling persistence and recovery.
 *  ============================================================ */
import type { KnowledgeGraph, GraphSerializer } from "./types.js";
export declare class JSONGraphSerializer implements GraphSerializer {
    /**
     * Serialize a KnowledgeGraph to a JSON string.
     * Sorts keys deterministically for reproducible output.
     */
    serialize(graph: KnowledgeGraph): string;
    /**
     * Deserialize a JSON string back into a KnowledgeGraph.
     */
    deserialize(data: string): KnowledgeGraph;
}
//# sourceMappingURL=graph-serializer.d.ts.map