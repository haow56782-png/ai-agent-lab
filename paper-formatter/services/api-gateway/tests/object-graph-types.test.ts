/**
 * PR #2 L2 Object Graph contract tests.
 * These tests do not build graphs; they pin the approved schema constants and
 * prove the type contract can represent figure/table/caption evidence.
 */
import { describe, expect, it } from "vitest";

import {
  CONTINUATION_VOTE_THRESHOLDS,
  OBJECT_GRAPH_SCHEMA_VERSION,
  type ObjectGraph,
} from "../src/parser/object-graph/types.js";

describe("Object Graph IR types", () => {
  it("pins approved continuation thresholds from PR #1", () => {
    expect(CONTINUATION_VOTE_THRESHOLDS).toEqual({
      confirmedEdge: 3,
      ambiguousEdge: 2,
    });
  });

  it("represents figure/table/caption nodes and continuation direction", () => {
    const graph = buildSampleGraph();

    expect(graph.schemaVersion).toBe(OBJECT_GRAPH_SCHEMA_VERSION);
    expect(graph.nodes.map((node) => node.kind)).toEqual(["figure", "caption", "table", "table"]);
    expect(graph.edges.find((edge) => edge.edgeType === "continues")).toMatchObject({
      fromObjectId: "table:continuation",
      toObjectId: "table:main",
      vote: {
        score: 3,
        decision: "edge",
        signals: ["schema_fingerprint_match", "adjacent_no_caption", "caption_text_continuation"],
      },
    });
    expect(graph.paragraphIndex.find((entry) => entry.paragraphIndex === 12)?.nodeIds).toContain("caption:figure:12");
  });
});

function buildSampleGraph(): ObjectGraph {
  return {
    schemaVersion: OBJECT_GRAPH_SCHEMA_VERSION,
    documentId: "doc_probe",
    documentVersion: "v1",
    source: {
      parser: "docx-xml",
      generatedAt: "2026-05-13T00:00:00.000Z",
      probeEvidence: {
        tableCount: 2,
        drawingCount: 1,
        captionCandidateCount: 1,
      },
    },
    nodes: [
      {
        objectId: "figure:10",
        kind: "figure",
        page: 1,
        paragraphIndex: 10,
        anchorParagraphIndex: 10,
        isInline: true,
        wrapMode: "inline",
        relationshipId: "rId5",
      },
      {
        objectId: "caption:figure:12",
        kind: "caption",
        page: 1,
        paragraphIndex: 12,
        captionKind: "figure",
        role: "primary",
        text: "图 1-1 探针流程图",
        styleName: "Caption",
        numberToken: "1-1",
        isContinuation: false,
      },
      {
        objectId: "table:main",
        kind: "table",
        page: 2,
        paragraphIndex: 20,
        startParagraphIndex: 20,
        endParagraphIndex: 20,
        rowCount: 4,
        columnCount: 3,
        headerRowCount: 0,
        hasTblHeaderInFirstRow: false,
        tblLookAttributes: { "w:firstRow": "1" },
        firstRowText: ["列 A", "列 B", "列 C"],
        headerRowTextHash: "hash-main",
        schemaFingerprint: "3-cols",
      },
      {
        objectId: "table:continuation",
        kind: "table",
        page: 3,
        paragraphIndex: 30,
        startParagraphIndex: 30,
        endParagraphIndex: 30,
        rowCount: 3,
        columnCount: 3,
        headerRowCount: 0,
        hasTblHeaderInFirstRow: false,
        tblLookAttributes: { "w:firstRow": "1" },
        firstRowText: ["列 A", "列 B", "列 C"],
        headerRowTextHash: "hash-main",
        schemaFingerprint: "3-cols",
      },
    ],
    edges: [
      {
        edgeId: "figure:10@p10",
        edgeType: "anchored_at",
        fromObjectId: "figure:10",
        anchorParagraphIndex: 10,
        confidence: 1,
      },
      {
        edgeId: "figure:10->caption:figure:12",
        edgeType: "captioned_by",
        fromObjectId: "figure:10",
        toObjectId: "caption:figure:12",
        captionKind: "figure",
        confidence: 0.95,
      },
      {
        edgeId: "table:continuation->table:main",
        edgeType: "continues",
        fromObjectId: "table:continuation",
        toObjectId: "table:main",
        confidence: 0.9,
        vote: {
          score: 3,
          decision: "edge",
          signals: ["schema_fingerprint_match", "adjacent_no_caption", "caption_text_continuation"],
        },
      },
    ],
    paragraphIndex: [
      { paragraphIndex: 10, nodeIds: ["figure:10"], edgeIds: ["figure:10@p10"] },
      { paragraphIndex: 12, nodeIds: ["caption:figure:12"], edgeIds: ["figure:10->caption:figure:12"] },
      { paragraphIndex: 20, nodeIds: ["table:main"], edgeIds: [] },
      { paragraphIndex: 30, nodeIds: ["table:continuation"], edgeIds: ["table:continuation->table:main"] },
    ],
    warnings: [],
  };
}
