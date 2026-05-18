/**
 * L2 Object Graph IR contract for DOCX figure/table/caption relationships.
 * This file defines types only for PR #2; extraction, graph building,
 * invariant linting, and detector migration remain separate PR slices.
 * Fields are grounded in PR #1 probe outputs from real DOCX XML samples.
 */
export const OBJECT_GRAPH_SCHEMA_VERSION = "object-graph.v0.1";
export const CONTINUATION_VOTE_THRESHOLDS = {
    confirmedEdge: 3,
    ambiguousEdge: 2,
};
