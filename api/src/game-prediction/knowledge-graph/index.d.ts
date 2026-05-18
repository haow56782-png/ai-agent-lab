/** ============================================================
 *  Knowledge Graph — Entry Point
 *
 *  Build → Query → Retrieve pipeline.
 *
 *  Exports:
 *    buildKnowledgeGraph(input)   — Build graph from engine outputs
 *    queryGraph(store, query)     — Run a specific graph query
 *    retrieveGraphContext(...)    — Get full GraphContext for engines
 *    InMemoryGraphStore           — Default store implementation
 *    JSONGraphSerializer          — Import/export utility
 *  ============================================================ */
export { buildGraph as buildKnowledgeGraph } from "./graph-builder.js";
export { executeGraphQuery as queryGraph } from "./graph-query.js";
export { retrieveGraphContext } from "./graph-retrieval.js";
export { InMemoryGraphStore } from "./graph-store.js";
export { JSONGraphSerializer } from "./graph-serializer.js";
export type { GraphNode, GraphEdge, GraphNodeType, GraphEdgeType, KnowledgeGraph, GraphBuildInput, GraphStore, GraphQuery, GraphQueryType, GraphQueryResult, GraphContext, RiskPatternResult, StrategyReliabilityResult, StopSessionPathResult, GameBehaviorRiskResult, LearningDriftResult, DebateOppositionResult, GraphSerializer, } from "./types.js";
//# sourceMappingURL=index.d.ts.map