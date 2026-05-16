import { describe, expect, it } from "vitest";
import { detectBodyStyle, detectHeadingSpacing } from "../src/rules/detectors/body-style.detector.js";
import { detectCaptionPosition } from "../src/rules/detectors/caption-position.detector.js";
import { detectFigureDirectoryReview } from "../src/rules/detectors/figure-directory.detector.js";
import { detectFooterPageNumber } from "../src/rules/detectors/footer-page-number.detector.js";
import { detectFootnoteStyleIssues } from "../src/rules/detectors/footnote-style.detector.js";
import { detectHeadingHierarchy } from "../src/rules/detectors/heading-hierarchy.detector.js";
import { detectPageSectionReview } from "../src/rules/detectors/page-section.detector.js";
import { detectPageLayout } from "../src/rules/detectors/page-layout.detector.js";
import { detectReferenceMissingDoi } from "../src/rules/detectors/reference-doi.detector.js";
import { runFormatRuleDetectors } from "../src/rules/rule-registry.js";
import { detectTableKeepTogether } from "../src/rules/detectors/table-keep-together.detector.js";
import { detectTocRefreshReview } from "../src/rules/detectors/toc.detector.js";

const baseContext = {
  doc: { canonical_document_id: "doc-1" } as any,
  profileId: "sch-001",
  sections: [{ page_width_cm: 21, margin_left_mm: 30, margin_right_mm: 25 }],
  images: [],
};

describe("additional format rule detectors", () => {
  it("detects footnote style issues from footnote paragraph style", () => {
    const detections = detectFootnoteStyleIssues({
      ...baseContext,
      paragraphs: [
        { index: 0, text: "注释内容", style: "Footnote Text", runs: [{ name: "Calibri", size_pt: 12 }] },
      ],
      tables: [],
      headings: [],
      structureItems: [],
    });
    expect(detections).toHaveLength(1);
    expect(detections[0].ruleId).toBe("FOOTNOTE_STYLE_NOT_ALLOWED");
  });

  it("detects missing DOI in reference entries", () => {
    const detections = detectReferenceMissingDoi({
      ...baseContext,
      paragraphs: [{ index: 1, text: "[1] Zhang Y. Example paper. Nature, 2025." }],
      tables: [],
      headings: [],
      structureItems: [{ index: 1, type: "reference_entry", text: "[1] Zhang Y. Example paper. Nature, 2025." }],
    });
    expect(detections).toHaveLength(1);
    expect(detections[0].ruleId).toBe("REFERENCE_MISSING_DOI");
  });

  it("detects risky large tables instead of default warning", () => {
    const detections = detectTableKeepTogether({
      ...baseContext,
      paragraphs: [],
      tables: [{ index: 0, rows: 10, cols: 5, data: [{ cells: ["很长的表格内容，需要复核跨页布局"] }] }],
      headings: [],
      structureItems: [],
    });
    expect(detections).toHaveLength(1);
    expect(detections[0].ruleId).toBe("TABLE_KEEP_TOGETHER");
  });

  it("detects toc refresh review when headings exist but toc is missing", () => {
    const detections = detectTocRefreshReview({
      ...baseContext,
      paragraphs: [{ index: 0, text: "第一章 绪论" }],
      tables: [],
      headings: [{ index: 0, text: "第一章 绪论" }, { index: 1, text: "第二章 方法" }, { index: 2, text: "第三章 结果" }],
      structureItems: [],
    });
    expect(detections).toHaveLength(1);
    expect(detections[0].ruleId).toBe("TOC_REFRESH_REVIEW");
  });

  it("detects figure directory review when multiple figure captions exist but no figure directory", () => {
    const detections = detectFigureDirectoryReview({
      ...baseContext,
      paragraphs: [{ index: 0, text: "图1-1 网络结构" }, { index: 1, text: "图2-1 实验流程" }],
      tables: [],
      headings: [],
      structureItems: [
        { index: 0, type: "figure_caption", text: "图1-1 网络结构" },
        { index: 1, type: "figure_caption", text: "图2-1 实验流程" },
      ],
    });
    expect(detections).toHaveLength(1);
    expect(detections[0].ruleId).toBe("FIGURE_DIRECTORY_REVIEW");
  });

  it("detects heading hierarchy issue when levels jump", () => {
    const detections = detectHeadingHierarchy({
      ...baseContext,
      paragraphs: [{ index: 0, text: "1.1.1 研究背景" }],
      tables: [],
      headings: [{ index: 0, text: "1.1.1 研究背景", level: 3 }],
      structureItems: [],
    });
    expect(detections).toHaveLength(1);
    expect(detections[0].ruleId).toBe("HEADING_HIERARCHY_REVIEW");
  });

  it("detects page section review when multiple level-1 headings lack page break", () => {
    const detections = detectPageSectionReview({
      ...baseContext,
      paragraphs: [
        { index: 0, text: "第一章 绪论", page_break_before: false },
        { index: 8, text: "第二章 方法", page_break_before: false },
      ],
      tables: [],
      headings: [
        { index: 0, text: "第一章 绪论", level: 1 },
        { index: 8, text: "第二章 方法", level: 1 },
      ],
      structureItems: [],
    });
    expect(detections).toHaveLength(1);
    expect(detections[0].ruleId).toBe("PAGE_SECTION_REVIEW");
  });

  it("detects page margin or gutter review when section layout deviates", () => {
    const detections = detectPageLayout({
      ...baseContext,
      sections: [{ margin_top_mm: 40, margin_bottom_mm: 20, margin_left_mm: 25, margin_right_mm: 20, gutter_mm: 4 }],
      paragraphs: [],
      tables: [],
      headings: [],
      structureItems: [],
      images: [],
    });
    expect(detections.map((item) => item.ruleId)).toEqual(["PAGE_MARGIN_REVIEW", "GUTTER_REVIEW"]);
  });

  it("uses profile thresholds when evaluating page layout", () => {
    const detections = detectPageLayout({
      ...baseContext,
      profile: {
        school_id: "cafa",
        rules_json: [
          { ruleId: "margin_top_mm", value: 32, unit: "mm" },
          { ruleId: "margin_bottom_mm", value: 27, unit: "mm" },
          { ruleId: "margin_left_mm", value: 32, unit: "mm" },
          { ruleId: "margin_right_mm", value: 27, unit: "mm" },
          { ruleId: "gutter_mm", value: 10, unit: "mm" },
        ],
        style_map: [],
      } as any,
      sections: [{ margin_top_mm: 25, margin_bottom_mm: 20, margin_left_mm: 25, margin_right_mm: 20, gutter_mm: 0 }],
      paragraphs: [],
      tables: [],
      headings: [],
      structureItems: [],
      images: [],
    });
    expect(detections.map((item) => item.ruleId)).toEqual(["PAGE_MARGIN_REVIEW", "GUTTER_REVIEW"]);
  });

  it("detects body style review when正文样式不统一", () => {
    const detections = detectBodyStyle({
      ...baseContext,
      paragraphs: [
        { index: 0, text: "正文一", is_heading: false, runs: [{ name: "宋体", size_pt: 12 }], spacing: { line_spacing: 1.5 }, indent: { first_line_cm: 0.74 } },
        { index: 1, text: "正文二", is_heading: false, runs: [{ name: "Calibri", size_pt: 11 }], spacing: { line_spacing: 1.2 }, indent: { first_line_cm: 0 } },
      ],
      tables: [],
      headings: [],
      structureItems: [],
      images: [],
    });
    expect(detections).toHaveLength(1);
    expect(detections[0].ruleId).toBe("BODY_STYLE_REVIEW");
  });

  it("uses profile thresholds when evaluating body style", () => {
    const detections = detectBodyStyle({
      ...baseContext,
      profile: {
        school_id: "cafa",
        rules_json: [{ ruleId: "line_spacing", value: 1.75 }],
        style_map: [{ ruleId: "body_fonts", allowedFonts: ["仿宋_GB2312", "Times New Roman"] }],
      } as any,
      paragraphs: [
        { index: 0, text: "正文一", is_heading: false, runs: [{ name: "宋体", size_pt: 12 }], spacing: { line_spacing: 1.5 }, indent: { first_line_cm: 0.74 } },
      ],
      tables: [],
      headings: [],
      structureItems: [],
      images: [],
    });
    expect(detections).toHaveLength(1);
    expect(detections[0].ruleId).toBe("BODY_STYLE_REVIEW");
  });

  it("detects heading spacing review when level-1 heading spacing deviates", () => {
    const detections = detectHeadingSpacing({
      ...baseContext,
      paragraphs: [
        { index: 0, text: "第一章 绪论", is_heading: true, heading_level: 1, spacing: { before_pt: 6, after_pt: 6 } },
      ],
      tables: [],
      headings: [{ index: 0, text: "第一章 绪论", level: 1 }],
      structureItems: [],
      images: [],
    });
    expect(detections).toHaveLength(1);
    expect(detections[0].ruleId).toBe("HEADING_SPACING_REVIEW");
  });

  it("detects footer alignment review when footer is not centered", () => {
    const detections = detectFooterPageNumber({
      ...baseContext,
      sections: [{ index: 0, footer_present: true, footer_alignment: "left", footer_text: "1", footer_has_page_field: true, footer_page_number_format: "arabic" }],
      paragraphs: [],
      tables: [],
      headings: [],
      structureItems: [],
      images: [],
    });
    expect(detections.some((item) => item.ruleId === "FOOTER_ALIGNMENT_REVIEW")).toBe(true);
  });

  it("detects front matter roman review when page field renders arabic digits", () => {
    const detections = detectFooterPageNumber({
      ...baseContext,
      sections: [{ index: 0, footer_present: true, footer_alignment: "center", footer_text: "1", footer_has_page_field: true, footer_page_number_format: "arabic" }],
      paragraphs: [],
      tables: [],
      headings: [],
      structureItems: [],
      images: [],
    });
    expect(detections.some((item) => item.ruleId === "FRONT_MATTER_ROMAN_REVIEW")).toBe(true);
  });

  it("detects figure caption position review when figure caption is not centered", () => {
    const detections = detectCaptionPosition({
      ...baseContext,
      paragraphs: [{ index: 3, text: "图1-1 网络结构", alignment: "left" }],
      tables: [],
      headings: [],
      structureItems: [{ index: 3, type: "figure_caption", text: "图1-1 网络结构" }],
      images: [],
    });
    expect(detections).toHaveLength(1);
    expect(detections[0].ruleId).toBe("FIGURE_CAPTION_POSITION_REVIEW");
  });

  it("detects figure caption placed before an image via flow anchors", () => {
    const detections = detectCaptionPosition({
      ...baseContext,
      paragraphs: [
        { index: 1, text: "图1-1 网络结构", alignment: "center", flow_order: 1, contains_image: false, image_count: 0 },
        { index: 2, text: "", alignment: "left", flow_order: 2, contains_image: true, image_count: 1 },
      ],
      tables: [],
      headings: [],
      structureItems: [{ index: 1, type: "figure_caption", text: "图1-1 网络结构", flow_order: 1 }],
      images: [{ paragraph_index: 2, flow_order: 2 }],
    });
    expect(detections).toHaveLength(1);
    expect(detections[0].ruleId).toBe("FIGURE_CAPTION_POSITION_REVIEW");
  });

  it("detects table caption placed below a table via flow anchors", () => {
    const detections = detectCaptionPosition({
      ...baseContext,
      paragraphs: [
        { index: 5, text: "表1-1 实验参数", alignment: "center", flow_order: 5, prev_flow_kind: "table", next_flow_kind: "paragraph" },
      ],
      tables: [{ index: 0, flow_order: 4 }],
      headings: [],
      structureItems: [{ index: 5, type: "table_caption", text: "表1-1 实验参数", flow_order: 5 }],
      images: [],
    });
    expect(detections).toHaveLength(1);
    expect(detections[0].ruleId).toBe("TABLE_CAPTION_POSITION_REVIEW");
  });

  it("supports multi-figure same-page binding without cross-matching", () => {
    const detections = detectCaptionPosition({
      ...baseContext,
      paragraphs: [
        { index: 10, text: "如图2-1所示，模型效果明显提升。", alignment: "justify", flow_order: 10 },
        { index: 11, text: "", alignment: "left", flow_order: 11, contains_image: true, image_count: 1 },
        { index: 12, text: "图2-1 中国石油\n财务结构图", alignment: "center", flow_order: 12 },
        { index: 13, text: "", alignment: "left", flow_order: 13, contains_image: true, image_count: 1 },
        { index: 14, text: "图2-2 杜邦分析体系", alignment: "center", flow_order: 14 },
      ],
      tables: [],
      headings: [],
      structureItems: [
        { index: 12, type: "figure_caption", text: "图2-1 中国石油\n财务结构图", flow_order: 12 },
        { index: 14, type: "figure_caption", text: "图2-2 杜邦分析体系", flow_order: 14 },
      ],
      images: [
        { paragraph_index: 11, flow_order: 11 },
        { paragraph_index: 13, flow_order: 13 },
      ],
    });
    expect(detections).toHaveLength(0);
  });

  it("aggregates repeated figure caption style findings by object-graph anchor class", () => {
    const detections = detectCaptionPosition({
      ...baseContext,
      paragraphs: [
        { index: 11, text: "", alignment: "left", flow_order: 11, contains_image: true, image_count: 1 },
        { index: 12, text: "图2-1 中国石油\n财务结构图", alignment: "left", flow_order: 12 },
        { index: 13, text: "", alignment: "left", flow_order: 13, contains_image: true, image_count: 1 },
        { index: 14, text: "图2-2 杜邦分析体系", alignment: "left", flow_order: 14 },
      ],
      tables: [],
      headings: [],
      structureItems: [
        { index: 12, type: "figure_caption", text: "图2-1 中国石油\n财务结构图", flow_order: 12 },
        { index: 14, type: "figure_caption", text: "图2-2 杜邦分析体系", flow_order: 14 },
      ],
      images: [
        { paragraph_index: 11, flow_order: 11 },
        { paragraph_index: 13, flow_order: 13 },
      ],
    });
    expect(detections).toHaveLength(1);
    expect(detections[0].ruleId).toBe("FIGURE_CAPTION_POSITION_REVIEW");
    expect(detections[0].snippet).toContain("同类题注 2 处");
    expect(detections[0].evidence?.anchor).toMatchObject({
      relationType: "caption_belongs_to_figure",
      captionKind: "figure",
    });
  });

  it("prefers object-graph caption and continuation detectors when objectGraph is present", () => {
    const detections = runFormatRuleDetectors({
      ...baseContext,
      paragraphs: [],
      tables: [],
      headings: [],
      structureItems: [],
      objectGraph: {
        schemaVersion: "object-graph.v0.1",
        source: { parser: "docx-xml", generatedAt: "2026-05-14T00:00:00.000Z" },
        nodes: [
          {
            objectId: "figure:1",
            kind: "figure",
            page: 1,
            paragraphIndex: 10,
            flowOrder: 10,
            anchorParagraphIndex: 10,
            isInline: true,
            wrapMode: "inline",
            relationshipId: "rId1",
          },
          {
            objectId: "caption:figure:9",
            kind: "caption",
            page: 1,
            paragraphIndex: 9,
            flowOrder: 9,
            captionKind: "figure",
            role: "primary",
            text: "图 1-1 错位图题",
            styleName: "Caption",
            numberToken: "1-1",
            isContinuation: false,
          },
          {
            objectId: "table:0",
            kind: "table",
            page: 2,
            paragraphIndex: 16,
            flowOrder: 16,
            startParagraphIndex: 16,
            endParagraphIndex: 16,
            rowCount: 2,
            columnCount: 2,
            headerRowCount: 0,
            hasTblHeaderInFirstRow: false,
            tblLookAttributes: {},
            firstRowText: ["列A", "列B"],
            headerRowTextHash: "hash",
            schemaFingerprint: "2:hash",
          },
          {
            objectId: "table:1",
            kind: "table",
            page: 3,
            paragraphIndex: 24,
            flowOrder: 24,
            startParagraphIndex: 24,
            endParagraphIndex: 24,
            rowCount: 2,
            columnCount: 2,
            headerRowCount: 0,
            hasTblHeaderInFirstRow: false,
            tblLookAttributes: {},
            firstRowText: ["列A", "列B"],
            headerRowTextHash: "hash",
            schemaFingerprint: "2:hash",
          },
        ],
        edges: [
          {
            edgeId: "figure:1->caption:figure:9",
            edgeType: "captioned_by",
            fromObjectId: "figure:1",
            toObjectId: "caption:figure:9",
            captionKind: "figure",
            confidence: 0.85,
          },
          {
            edgeId: "table:1->table:0",
            edgeType: "continues",
            fromObjectId: "table:1",
            toObjectId: "table:0",
            confidence: 0.75,
            vote: {
              score: 2,
              decision: "edge_with_warning",
              signals: ["schema_fingerprint_match"],
              warningCode: "continuation_ambiguous",
            },
            evidence: {
              paragraphIndexes: [20],
              captionsBetween: ["表 1-1（续）"],
              firstRowText: ["列A", "列B"],
              headerRowTextHash: "hash",
            },
          },
        ],
        paragraphIndex: [],
        warnings: [],
      },
      images: [],
      sections: [],
      flowItems: [],
    } as any);

    expect(detections.some((item) => item.ruleId === "FIGURE_CAPTION_POSITION_REVIEW")).toBe(true);
    expect(detections.some((item) => item.ruleId === "TABLE_CONTINUATION_REVIEW")).toBe(true);
  });

  it("supports multi-table same-page binding and only flags the misplaced caption", () => {
    const detections = detectCaptionPosition({
      ...baseContext,
      paragraphs: [
        { index: 20, text: "表3-1 财务指标汇总", alignment: "center", flow_order: 20, prev_flow_kind: "paragraph", next_flow_kind: "table" },
        { index: 21, text: "表3-2 杜邦指标拆解", alignment: "center", flow_order: 21, prev_flow_kind: "table", next_flow_kind: "paragraph" },
      ],
      tables: [
        { index: 0, flow_order: 22 },
        { index: 1, flow_order: 19 },
      ],
      headings: [],
      structureItems: [
        { index: 20, type: "table_caption", text: "表3-1 财务指标汇总", flow_order: 20 },
        { index: 21, type: "table_caption", text: "表3-2 杜邦指标拆解", flow_order: 21 },
      ],
      images: [],
    });
    expect(detections).toHaveLength(1);
    expect(detections[0].ruleId).toBe("TABLE_CAPTION_POSITION_REVIEW");
    expect(detections[0].snippet).toContain("表3-2");
    expect(detections[0].evidence?.anchor).toMatchObject({
      fromObjectId: "caption:table_caption:21",
      toObjectId: "table:1",
      relationType: "caption_wrong_position",
      captionKind: "table",
    });
  });
});
