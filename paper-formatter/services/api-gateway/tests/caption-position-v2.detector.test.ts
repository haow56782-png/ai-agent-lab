/**
 * PR #6 caption-position v2 detector tests.
 * These tests exercise ObjectGraph-backed detection while legacy
 * caption-position.detector.ts remains registered separately.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import type { ObjectGraph } from "../src/parser/object-graph/types.js";
import {
  detectCaptionPositionV2,
} from "../src/rules/detectors/caption-position-v2.detector.js";

describe("caption-position v2 detector", () => {
  it("detects figure caption placed before the figure", () => {
    const detections = detectCaptionPositionV2(buildGraph({
      nodes: [
        figure("figure:1", 10),
        caption("caption:figure:9", "figure", 9, "图 1-1 错位图题"),
      ],
      edges: [captionedBy("figure:1", "caption:figure:9")],
    }));

    expect(detections).toHaveLength(1);
    expect(detections[0]).toMatchObject({
      ruleId: "FIGURE_CAPTION_POSITION_REVIEW",
      label: "图题居下居中",
      evidence: {
        paragraphIndex: 9,
        anchor: {
          relationId: "figure:1->caption:figure:9",
          fromObjectId: "caption:figure:9",
          toObjectId: "figure:1",
          relationType: "caption_wrong_position",
          captionKind: "figure",
        },
      },
    });
  });

  it("detects table caption placed after the table", () => {
    const detections = detectCaptionPositionV2(buildGraph({
      nodes: [
        table("table:1", 10),
        caption("caption:table:11", "table", 11, "表 1-1 错位表题"),
      ],
      edges: [captionedBy("table:1", "caption:table:11")],
    }));

    expect(detections).toHaveLength(1);
    expect(detections[0]).toMatchObject({
      ruleId: "TABLE_CAPTION_POSITION_REVIEW",
      label: "表题居上",
      evidence: {
        paragraphIndex: 11,
        anchor: {
          relationId: "table:1->caption:table:11",
          fromObjectId: "caption:table:11",
          toObjectId: "table:1",
          relationType: "caption_wrong_position",
          captionKind: "table",
        },
      },
    });
  });

  it("does not report correctly positioned captions", () => {
    const detections = detectCaptionPositionV2(buildGraph({
      nodes: [
        figure("figure:1", 10),
        caption("caption:figure:11", "figure", 11, "图 1-1 正确图题"),
        table("table:1", 20),
        caption("caption:table:19", "table", 19, "表 1-1 正确表题"),
      ],
      edges: [
        captionedBy("figure:1", "caption:figure:11"),
        captionedBy("table:1", "caption:table:19"),
      ],
    }));

    expect(detections).toEqual([]);
  });

  it("flags unbound captions with explicit object evidence", () => {
    const detections = detectCaptionPositionV2(buildGraph({
      nodes: [caption("caption:figure:8", "figure", 8, "图 1-2 未绑定图题")],
      edges: [],
    }));

    expect(detections).toHaveLength(1);
    expect(detections[0]).toMatchObject({
      ruleId: "FIGURE_CAPTION_POSITION_REVIEW",
      evidence: {
        anchor: {
          relationId: "caption:figure:8->unbound",
          fromObjectId: "caption:figure:8",
          toObjectId: "",
          relationType: "caption_unbound",
          captionKind: "figure",
        },
      },
      suggestion: {
        explanation: "图题未能绑定到真实图片对象，建议人工确认对象锚点。",
      },
    });
  });

  it("can read all ObjectGraph snapshot fixtures without crashing", () => {
    for (const graph of loadSnapshotGraphs()) {
      const detections = detectCaptionPositionV2(graph);
      for (const detection of detections) {
        expect(detection.evidence?.anchor?.fromObjectId).toBeTruthy();
        expect(["caption_wrong_position", "caption_unbound"]).toContain(detection.evidence?.anchor?.relationType);
      }
    }
  });
});

function buildGraph(input: Pick<ObjectGraph, "nodes" | "edges">): ObjectGraph {
  return {
    schemaVersion: "object-graph.v0.1",
    source: {
      parser: "docx-xml",
      generatedAt: "2026-05-13T00:00:00.000Z",
    },
    nodes: input.nodes,
    edges: input.edges,
    paragraphIndex: [],
    warnings: [],
  };
}

function figure(objectId: string, paragraphIndex: number): ObjectGraph["nodes"][number] {
  return {
    objectId,
    kind: "figure",
    page: 1,
    paragraphIndex,
    flowOrder: paragraphIndex,
    anchorParagraphIndex: paragraphIndex,
    isInline: true,
    wrapMode: "inline",
    relationshipId: "rId1",
  };
}

function table(objectId: string, paragraphIndex: number): ObjectGraph["nodes"][number] {
  return {
    objectId,
    kind: "table",
    page: 1,
    paragraphIndex,
    flowOrder: paragraphIndex,
    startParagraphIndex: paragraphIndex,
    endParagraphIndex: paragraphIndex,
    rowCount: 2,
    columnCount: 2,
    headerRowCount: 0,
    hasTblHeaderInFirstRow: false,
    tblLookAttributes: {},
    firstRowText: ["A", "B"],
    headerRowTextHash: "hash",
    schemaFingerprint: "2:hash",
  };
}

function caption(
  objectId: string,
  captionKind: "figure" | "table",
  paragraphIndex: number,
  text: string,
): ObjectGraph["nodes"][number] {
  return {
    objectId,
    kind: "caption",
    page: 1,
    paragraphIndex,
    flowOrder: paragraphIndex,
    captionKind,
    role: "primary",
    text,
    styleName: "Caption",
    numberToken: "1-1",
    isContinuation: false,
  };
}

function captionedBy(fromObjectId: string, toObjectId: string): ObjectGraph["edges"][number] {
  return {
    edgeId: `${fromObjectId}->${toObjectId}`,
    edgeType: "captioned_by",
    fromObjectId,
    toObjectId,
    captionKind: toObjectId.includes(":figure:") ? "figure" : "table",
    confidence: 0.85,
  };
}

function loadSnapshotGraphs(): ObjectGraph[] {
  const dir = path.resolve(process.cwd(), "tests/fixtures/object-graph");
  return readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => JSON.parse(readFileSync(path.join(dir, name), "utf8")) as ObjectGraph);
}
