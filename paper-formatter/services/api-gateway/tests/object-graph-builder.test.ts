/**
 * PR #4 Object Graph builder tests.
 * These tests verify graph construction and the approved continuation voting
 * semantics without wiring ObjectGraph into analyze jobs or detectors.
 */
import { describe, expect, it } from "vitest";

import type { DocxObjectExtraction } from "../src/parser/docx-object-extractor.js";
import {
  buildObjectGraphFromExtraction,
  voteTableContinuation,
} from "../src/parser/object-graph/builder.js";

describe("Object Graph builder", () => {
  it("builds figure/table/caption nodes and relationship edges", () => {
    const graph = buildObjectGraphFromExtraction(buildExtraction(), {
      documentId: "doc_graph",
      documentVersion: "v1",
      generatedAt: "2026-05-13T00:00:00.000Z",
    });

    expect(graph.documentId).toBe("doc_graph");
    expect(graph.nodes.map((node) => node.objectId)).toEqual([
      "figure:0:0",
      "caption:figure:1",
      "caption:table:2",
      "table:0",
      "caption:table:3",
      "table:1",
    ]);
    expect(graph.edges).toEqual(expect.arrayContaining([
      expect.objectContaining({
        edgeId: "figure:0:0@p0",
        edgeType: "anchored_at",
        fromObjectId: "figure:0:0",
        anchorParagraphIndex: 0,
      }),
      expect.objectContaining({
        edgeId: "figure:0:0->caption:figure:1",
        edgeType: "captioned_by",
        fromObjectId: "figure:0:0",
        toObjectId: "caption:figure:1",
        captionKind: "figure",
      }),
      expect.objectContaining({
        edgeId: "table:0->caption:table:2",
        edgeType: "captioned_by",
        fromObjectId: "table:0",
        toObjectId: "caption:table:2",
        captionKind: "table",
      }),
      expect.objectContaining({
        edgeId: "table:1->table:0",
        edgeType: "continues",
        fromObjectId: "table:1",
        toObjectId: "table:0",
        vote: expect.objectContaining({
          score: 5,
          decision: "edge",
          signals: ["schema_fingerprint_match", "adjacent_no_caption", "adjacent_no_body_text", "caption_text_continuation"],
        }),
      }),
    ]));
    expect(graph.warnings).toEqual([]);
    expect(graph.paragraphIndex.find((entry) => entry.paragraphIndex === 3)?.nodeIds).toContain("caption:table:3");
    expect(graph.source.probeEvidence).toEqual({
      tableCount: 2,
      drawingCount: 1,
      captionCandidateCount: 3,
    });
  });

  it("keeps ambiguous continuation edges and emits warning at score 2", () => {
    const extraction = buildExtraction({
      captionsBetween: [{
        objectId: "caption:table:3",
        bodyIndex: 4,
        paragraphIndex: 3,
        text: "表 1-2 新主表",
        styleName: "Caption",
        matchedPattern: "table",
        captionKind: "table",
        numberToken: "1-2",
        isContinuation: false,
      }],
    });

    const graph = buildObjectGraphFromExtraction(extraction, { generatedAt: "2026-05-13T00:00:00.000Z" });
    const continues = graph.edges.find((edge) => edge.edgeType === "continues");

    expect(continues).toMatchObject({
      fromObjectId: "table:1",
      toObjectId: "table:0",
      vote: {
        score: 2,
        decision: "edge_with_warning",
        signals: ["schema_fingerprint_match"],
        warningCode: "continuation_ambiguous",
      },
    });
    expect(graph.warnings).toEqual([
      expect.objectContaining({
        code: "continuation_ambiguous",
        nodeIds: ["table:1", "table:0"],
      }),
    ]);
  });

  it("does not build continuation edge when vote score is below threshold", () => {
    const extraction = buildExtraction({
      secondTable: {
        firstRowText: ["其他列"],
        headerRowTextHash: "hash-other",
        schemaFingerprint: "1:hash-other",
        columnCount: 1,
      },
      captionsBetween: [{
        objectId: "caption:table:3",
        bodyIndex: 4,
        paragraphIndex: 3,
        text: "表 1-2 新主表",
        styleName: "Caption",
        matchedPattern: "table",
        captionKind: "table",
        numberToken: "1-2",
        isContinuation: false,
      }],
    });

    const graph = buildObjectGraphFromExtraction(extraction);

    expect(graph.edges.some((edge) => edge.edgeType === "continues")).toBe(false);
    expect(graph.warnings).toEqual([]);
  });
});

describe("voteTableContinuation", () => {
  it("uses table header match before schema fingerprint and applies approved thresholds", () => {
    const vote = voteTableContinuation(
      { headerRowCount: 0, firstRowText: ["A", "B"], schemaFingerprint: "2:ab" },
      { headerRowCount: 1, firstRowText: ["A", "B"], schemaFingerprint: "2:ab" },
      [{ text: "续表 1-1" }],
      [{ role: "continuation", isContinuation: true }],
    );

    expect(vote).toEqual({
      score: 5,
      decision: "edge",
      signals: ["tbl_header_match", "adjacent_no_caption", "adjacent_no_body_text", "caption_text_continuation"],
    });
  });

  it("does not award adjacency body signal when non-empty body text exists between tables", () => {
    const vote = voteTableContinuation(
      { headerRowCount: 0, firstRowText: ["A", "B"], schemaFingerprint: "2:ab" },
      { headerRowCount: 0, firstRowText: ["A", "B"], schemaFingerprint: "2:ab" },
      [{ text: "这一段正文说明了表格之间的业务差异。" }],
      [],
    );

    expect(vote).toEqual({
      score: 2,
      decision: "edge_with_warning",
      signals: ["schema_fingerprint_match"],
      warningCode: "continuation_ambiguous",
    });
  });
});

function buildExtraction(overrides: {
  secondTable?: Partial<DocxObjectExtraction["tables"][number]>;
  captionsBetween?: DocxObjectExtraction["captionCandidates"];
} = {}): DocxObjectExtraction {
  const captionsBetween = overrides.captionsBetween ?? [{
    objectId: "caption:table:3",
    bodyIndex: 4,
    paragraphIndex: 3,
    text: "续表 1-1",
    styleName: "Caption",
    matchedPattern: "continuation",
    captionKind: "table",
    numberToken: "续表 1-1",
    isContinuation: true,
  }];

  return {
    docxPath: "/tmp/sample.docx",
    stats: {
      paragraphCount: 5,
      tableCount: 2,
      drawingCount: 1,
      captionCandidateCount: 2 + captionsBetween.length,
    },
    paragraphs: [
      { bodyIndex: 0, paragraphIndex: 0, text: "", styleName: "" },
      { bodyIndex: 1, paragraphIndex: 1, text: "图 1-1 流程图", styleName: "Caption" },
      { bodyIndex: 2, paragraphIndex: 2, text: "表 1-1 数据表", styleName: "Caption" },
      { bodyIndex: 4, paragraphIndex: 3, text: captionsBetween[0]?.text ?? "", styleName: "Caption" },
      { bodyIndex: 6, paragraphIndex: 4, text: "正文段落", styleName: "" },
    ],
    drawings: [{
      objectId: "figure:0:0",
      bodyIndex: 0,
      anchorParagraphIndex: 0,
      wrapMode: "inline",
      relationshipId: "rId5",
      isInline: true,
    }],
    captionCandidates: [
      {
        objectId: "caption:figure:1",
        bodyIndex: 1,
        paragraphIndex: 1,
        text: "图 1-1 流程图",
        styleName: "Caption",
        matchedPattern: "figure",
        captionKind: "figure",
        numberToken: "1-1",
        isContinuation: false,
      },
      {
        objectId: "caption:table:2",
        bodyIndex: 2,
        paragraphIndex: 2,
        text: "表 1-1 数据表",
        styleName: "Caption",
        matchedPattern: "table",
        captionKind: "table",
        numberToken: "1-1",
        isContinuation: false,
      },
      ...captionsBetween,
    ],
    tables: [
      {
        objectId: "table:0",
        bodyIndex: 3,
        startParagraphIndex: 3,
        endParagraphIndex: 3,
        rowCount: 3,
        columnCount: 2,
        headerRowCount: 0,
        hasTblHeaderInFirstRow: false,
        tblLookAttributes: { "w:firstRow": "1" },
        firstRowText: ["列 A", "列 B"],
        headerRowTextHash: "hash-ab",
        schemaFingerprint: "2:hash-ab",
      },
      {
        objectId: "table:1",
        bodyIndex: 5,
        startParagraphIndex: 4,
        endParagraphIndex: 4,
        rowCount: 2,
        columnCount: 2,
        headerRowCount: 0,
        hasTblHeaderInFirstRow: false,
        tblLookAttributes: { "w:firstRow": "1" },
        firstRowText: ["列 A", "列 B"],
        headerRowTextHash: "hash-ab",
        schemaFingerprint: "2:hash-ab",
        ...overrides.secondTable,
      },
    ],
    adjacentTablePairs: [{
      prevTableObjectId: "table:0",
      currTableObjectId: "table:1",
      prevTableIndex: 0,
      currTableIndex: 1,
      paragraphsBetween: captionsBetween.map((caption) => ({ paragraphIndex: caption.paragraphIndex, text: caption.text })),
      captionsBetween,
    }],
    warnings: [],
  };
}
