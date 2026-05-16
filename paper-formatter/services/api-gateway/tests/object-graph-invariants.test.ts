/**
 * PR #8 ObjectGraph invariant lint tests.
 * These tests pin the structural guardrails that keep the new L2 graph safe:
 * unique object identity, caption/object anchor direction, and continuation
 * schema consistency. The lint returns warnings instead of throwing.
 */
import { describe, expect, it } from "vitest";

import { lintObjectGraphInvariants } from "../src/parser/object-graph/invariants.js";
import type { ObjectGraph } from "../src/parser/object-graph/types.js";

describe("ObjectGraph invariants lint", () => {
  it("passes a graph with unique nodes, monotonic caption anchors, and matching continuation schema", () => {
    const warnings = lintObjectGraphInvariants(buildGraph({
      nodes: [
        figure("figure:1", 10),
        caption("caption:figure:11", "figure", 11),
        caption("caption:table:19", "table", 19),
        table("table:1", 20, "2:main"),
        table("table:2", 28, "2:main"),
      ],
      edges: [
        captionedBy("figure:1", "caption:figure:11", "figure"),
        captionedBy("table:1", "caption:table:19", "table"),
        continues("table:2", "table:1"),
      ],
    }));

    expect(warnings).toEqual([]);
  });

  it("warns when object ids are duplicated", () => {
    const warnings = lintObjectGraphInvariants(buildGraph({
      nodes: [
        figure("figure:1", 10),
        figure("figure:1", 12),
      ],
      edges: [],
    }));

    expect(warnings).toEqual([
      expect.objectContaining({
        code: "invariant_violation",
        message: "ObjectGraph contains duplicate node id figure:1.",
        nodeIds: ["figure:1"],
      }),
    ]);
  });

  it("warns when a figure caption appears before the figure anchor", () => {
    const warnings = lintObjectGraphInvariants(buildGraph({
      nodes: [
        figure("figure:1", 10),
        caption("caption:figure:9", "figure", 9),
      ],
      edges: [captionedBy("figure:1", "caption:figure:9", "figure")],
    }));

    expect(warnings).toEqual([
      expect.objectContaining({
        code: "invariant_violation",
        edgeIds: ["figure:1->caption:figure:9"],
        nodeIds: ["figure:1", "caption:figure:9"],
      }),
    ]);
    expect(warnings[0]?.message).toContain("must appear after figure");
  });

  it("warns when a table caption appears after the table start", () => {
    const warnings = lintObjectGraphInvariants(buildGraph({
      nodes: [
        table("table:1", 10, "2:main"),
        caption("caption:table:11", "table", 11),
      ],
      edges: [captionedBy("table:1", "caption:table:11", "table")],
    }));

    expect(warnings).toEqual([
      expect.objectContaining({
        code: "invariant_violation",
        edgeIds: ["table:1->caption:table:11"],
        nodeIds: ["table:1", "caption:table:11"],
      }),
    ]);
    expect(warnings[0]?.message).toContain("must appear before table");
  });

  it("warns when a continuation edge links different table schemas", () => {
    const warnings = lintObjectGraphInvariants(buildGraph({
      nodes: [
        table("table:main", 10, "3:main"),
        table("table:continued", 20, "4:changed"),
      ],
      edges: [continues("table:continued", "table:main")],
    }));

    expect(warnings).toEqual([
      expect.objectContaining({
        code: "invariant_violation",
        edgeIds: ["table:continued->table:main"],
        nodeIds: ["table:continued", "table:main"],
      }),
    ]);
    expect(warnings[0]?.message).toContain("different schema fingerprints");
  });

  it("warns when graph edges reference missing nodes", () => {
    const warnings = lintObjectGraphInvariants(buildGraph({
      nodes: [figure("figure:1", 10)],
      edges: [captionedBy("figure:1", "caption:missing", "figure")],
    }));

    expect(warnings).toEqual([
      expect.objectContaining({
        code: "invariant_violation",
        edgeIds: ["figure:1->caption:missing"],
        nodeIds: ["caption:missing"],
      }),
    ]);
  });
});

function buildGraph(input: Pick<ObjectGraph, "nodes" | "edges">): Pick<ObjectGraph, "nodes" | "edges"> {
  return input;
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

function table(
  objectId: string,
  paragraphIndex: number,
  schemaFingerprint: string,
): ObjectGraph["nodes"][number] {
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
    schemaFingerprint,
  };
}

function caption(
  objectId: string,
  captionKind: "figure" | "table",
  paragraphIndex: number,
): ObjectGraph["nodes"][number] {
  return {
    objectId,
    kind: "caption",
    page: 1,
    paragraphIndex,
    flowOrder: paragraphIndex,
    captionKind,
    role: "primary",
    text: captionKind === "figure" ? "图 1-1 示例图" : "表 1-1 示例表",
    styleName: "Caption",
    numberToken: "1-1",
    isContinuation: false,
  };
}

function captionedBy(
  fromObjectId: string,
  toObjectId: string,
  captionKind: "figure" | "table",
): ObjectGraph["edges"][number] {
  return {
    edgeId: `${fromObjectId}->${toObjectId}`,
    edgeType: "captioned_by",
    fromObjectId,
    toObjectId,
    captionKind,
    confidence: 0.85,
  };
}

function continues(fromObjectId: string, toObjectId: string): ObjectGraph["edges"][number] {
  return {
    edgeId: `${fromObjectId}->${toObjectId}`,
    edgeType: "continues",
    fromObjectId,
    toObjectId,
    confidence: 0.85,
    vote: {
      score: 3,
      decision: "edge",
      signals: ["schema_fingerprint_match", "adjacent_no_caption"],
    },
  };
}
