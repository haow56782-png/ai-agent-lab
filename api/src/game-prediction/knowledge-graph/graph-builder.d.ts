/** ============================================================
 *  Graph Builder — Builds a KnowledgeGraph from engine outputs.
 *
 *  Consumes outputs from all 5 engines (Memory, Decision,
 *  Behavior, Learning, Debate, Simulation) and creates typed
 *  nodes and edges representing their relationships.
 *  ============================================================ */
import type { GraphBuildInput, KnowledgeGraph } from "./types.js";
import { InMemoryGraphStore } from "./graph-store.js";
/**
 * Build a complete KnowledgeGraph from engine outputs.
 */
export declare function buildGraph(input: GraphBuildInput): Promise<{
    store: InMemoryGraphStore;
    graph: KnowledgeGraph;
}>;
//# sourceMappingURL=graph-builder.d.ts.map