/**
 * PR #7 table-continuation detector tests.
 * The detector consumes ObjectGraph and remains unregistered in this slice.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import type { ObjectGraph } from "../src/parser/object-graph/types.js";
import { detectTableContinuation } from "../src/rules/detectors/table-continuation.detector.js";

describe("table-continuation detector", () => {
  it("does not emit detections for confirmed continuation edges", () => {
    const detections = detectTableContinuation(buildGraph({ decision: "edge", score: 4 }));

    expect(detections).toEqual([]);
  });

  it("emits manual review detection for ambiguous continuation edges", () => {
    const detections = detectTableContinuation(buildGraph({ decision: "edge_with_warning", score: 2 }));

    expect(detections).toHaveLength(1);
    expect(detections[0]).toMatchObject({
      ruleId: "TABLE_CONTINUATION_REVIEW",
      label: "续表关系确认",
      group: "图表 & 题注",
      severity: "P2",
      confidence: 0.75,
      page: 2,
      snippet: "表 1-1（续）",
      evidence: {
        paragraphIndex: 10,
        objectName: "table:1",
        anchor: {
          relationId: "table:1->table:0",
          fromObjectId: "table:1",
          toObjectId: "table:0",
          relationType: "continues_ambiguous",
          captionKind: "table",
        },
      },
      suggestion: {
        type: "manual_review",
        before: "table:0 <- table:1",
      },
    });
    expect(detections[0].suggestion.explanation).toContain("续表投票分数为 2");
  });

  it("detects the two ambiguous continuation edges in the BNU snapshot fixture", () => {
    const graph = loadFixture("2. 北京师范大学学位论文word版参考模板（一）.docx.object-graph.json");
    const detections = detectTableContinuation(graph);

    expect(detections).toHaveLength(2);
    expect(detections.map((detection) => detection.evidence?.anchor?.relationId)).toEqual([
      "table:2->table:1",
      "table:5->table:4",
    ]);
    expect(detections.every((detection) => detection.ruleId === "TABLE_CONTINUATION_REVIEW")).toBe(true);
  });
});

function buildGraph(input: { decision: "edge" | "edge_with_warning"; score: number }): ObjectGraph {
  return {
    schemaVersion: "object-graph.v0.1",
    source: {
      parser: "docx-xml",
      generatedAt: "2026-05-13T00:00:00.000Z",
    },
    nodes: [
      table("table:0", 8),
      table("table:1", 10),
    ],
    edges: [{
      edgeId: "table:1->table:0",
      edgeType: "continues",
      fromObjectId: "table:1",
      toObjectId: "table:0",
      confidence: 0.75,
      vote: {
        score: input.score,
        decision: input.decision,
        signals: ["schema_fingerprint_match"],
        warningCode: input.decision === "edge_with_warning" ? "continuation_ambiguous" : undefined,
      },
      evidence: {
        paragraphIndexes: [9],
        captionsBetween: ["表 1-1（续）"],
        firstRowText: ["列 A", "列 B"],
        headerRowTextHash: "hash",
      },
    }],
    paragraphIndex: [],
    warnings: input.decision === "edge_with_warning"
      ? [{
        code: "continuation_ambiguous",
        message: "Table continuation edge table:1->table:0 has score 2.",
        nodeIds: ["table:1", "table:0"],
        edgeIds: ["table:1->table:0"],
        disposition: "warning",
      }]
      : [],
  };
}

function table(objectId: string, paragraphIndex: number): ObjectGraph["nodes"][number] {
  return {
    objectId,
    kind: "table",
    page: Math.max(1, Math.floor(paragraphIndex / 8) + 1),
    paragraphIndex,
    flowOrder: paragraphIndex,
    startParagraphIndex: paragraphIndex,
    endParagraphIndex: paragraphIndex,
    rowCount: 3,
    columnCount: 2,
    headerRowCount: 0,
    hasTblHeaderInFirstRow: false,
    tblLookAttributes: {},
    firstRowText: ["列 A", "列 B"],
    headerRowTextHash: "hash",
    schemaFingerprint: "2:hash",
  };
}

function loadFixture(name: string): ObjectGraph {
  return JSON.parse(
    readFileSync(path.resolve(process.cwd(), "tests/fixtures/object-graph", name), "utf8"),
  ) as ObjectGraph;
}
