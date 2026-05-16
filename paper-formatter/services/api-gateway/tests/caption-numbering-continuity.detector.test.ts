import { describe, expect, it } from "vitest";
import {
  detectCaptionNumberingContinuity,
  CAPTION_NUMBERING_CONTINUITY_RULE_ID,
} from "../src/rules/detectors/caption-numbering-continuity.detector.js";

const baseContext = {
  doc: { canonical_document_id: "doc-caption" } as any,
  profileId: "sch-001",
  sections: [],
  images: [],
  tables: [],
  paragraphs: [],
  headings: [],
};

describe("caption-numbering-continuity detector", () => {
  describe("figure caption continuity", () => {
    it("detects figure numbering gap (chapter-seq style)", () => {
      const detections = detectCaptionNumberingContinuity({
        ...baseContext,
        structureItems: [
          { index: 10, type: "figure_caption", text: "图 1-1 系统架构图" },
          { index: 15, type: "figure_caption", text: "图 1-2 网络拓扑图" },
          { index: 20, type: "figure_caption", text: "图 1-4 数据流图" },  // gap: missing 1-3
          { index: 25, type: "figure_caption", text: "图 1-5 处理流程图" },
        ],
      });

      expect(detections.length).toBe(1);
      expect(detections[0].ruleId).toBe(CAPTION_NUMBERING_CONTINUITY_RULE_ID);
      expect(detections[0].severity).toBe("P0");
      expect(detections[0].label).toContain("跳号");
      expect(detections[0].suggestion.explanation).toContain("不连续");
      expect(detections[0].suggestion.explanation).toContain("1-2");
      expect(detections[0].suggestion.explanation).toContain("1-4");
    });

    it("detects figure numbering duplicate", () => {
      const detections = detectCaptionNumberingContinuity({
        ...baseContext,
        structureItems: [
          { index: 10, type: "figure_caption", text: "图 2-1 实验装置" },
          { index: 15, type: "figure_caption", text: "图 2-2 实验结果" },
          { index: 20, type: "figure_caption", text: "图 2-2 重复编号" },  // duplicate
          { index: 25, type: "figure_caption", text: "图 2-3 对比分析" },
        ],
      });

      const dupDetections = detections.filter((d) => d.label.includes("重复"));
      expect(dupDetections.length).toBe(1);
      expect(dupDetections[0].ruleId).toBe(CAPTION_NUMBERING_CONTINUITY_RULE_ID);
      expect(dupDetections[0].confidence).toBeGreaterThanOrEqual(0.9);
    });

    it("passes for clean continuous figure numbering", () => {
      const detections = detectCaptionNumberingContinuity({
        ...baseContext,
        structureItems: [
          { index: 10, type: "figure_caption", text: "图 1-1" },
          { index: 15, type: "figure_caption", text: "图 1-2" },
          { index: 20, type: "figure_caption", text: "图 1-3" },
          { index: 25, type: "figure_caption", text: "图 2-1" },
          { index: 30, type: "figure_caption", text: "图 2-2" },
        ],
      });

      expect(detections).toEqual([]);
    });

    it("handles figure captions with dot separator (图 1.1)", () => {
      const detections = detectCaptionNumberingContinuity({
        ...baseContext,
        structureItems: [
          { index: 10, type: "figure_caption", text: "图 1.1 架构图" },
          { index: 15, type: "figure_caption", text: "图 1.2 拓扑图" },
          { index: 20, type: "figure_caption", text: "图 1.4 数据流" },  // gap
        ],
      });

      expect(detections.length).toBe(1);
    });

    it("handles English figure captions (Figure 2-3)", () => {
      const detections = detectCaptionNumberingContinuity({
        ...baseContext,
        structureItems: [
          { index: 10, type: "figure_caption", text: "Figure 2-1 Architecture" },
          { index: 15, type: "figure_caption", text: "Figure 2-3 Data Flow" },  // gap: missing 2-2
        ],
      });

      expect(detections.length).toBe(1);
      expect(detections[0].suggestion.explanation).toContain("Figure");
    });
  });

  describe("table caption continuity", () => {
    it("detects table numbering gap", () => {
      const detections = detectCaptionNumberingContinuity({
        ...baseContext,
        structureItems: [
          { index: 50, type: "table_caption", text: "表 3-1 数据集统计" },
          { index: 55, type: "table_caption", text: "表 3-2 评估指标" },
          { index: 60, type: "table_caption", text: "表 3-4 对比结果" },  // gap
        ],
      });

      expect(detections.length).toBe(1);
      expect(detections[0].label).toContain("表");
      expect(detections[0].label).toContain("跳号");
    });

    it("detects table numbering duplicate", () => {
      const detections = detectCaptionNumberingContinuity({
        ...baseContext,
        structureItems: [
          { index: 50, type: "table_caption", text: "表 1 实验数据" },
          { index: 55, type: "table_caption", text: "表 2 评估指标" },
          { index: 60, type: "table_caption", text: "表 2 重复表题" },  // duplicate
          { index: 65, type: "table_caption", text: "表 3 对比分析" },
        ],
      });

      const dupDetections = detections.filter((d) => d.label.includes("重复"));
      expect(dupDetections.length).toBe(1);
      expect(dupDetections[0].ruleId).toBe(CAPTION_NUMBERING_CONTINUITY_RULE_ID);
    });

    it("handles global numbering style (表 1, 表 2, ...)", () => {
      const detections = detectCaptionNumberingContinuity({
        ...baseContext,
        structureItems: [
          { index: 50, type: "table_caption", text: "表 1 数据集" },
          { index: 55, type: "table_caption", text: "表 3 评估指标" },  // gap: missing 表 2
          { index: 60, type: "table_caption", text: "表 4 对比结果" },
        ],
      });

      expect(detections.length).toBe(1);
      expect(detections[0].suggestion.explanation).toContain("全文");
    });

    it("passes for clean global numbering", () => {
      const detections = detectCaptionNumberingContinuity({
        ...baseContext,
        structureItems: [
          { index: 50, type: "table_caption", text: "表 1" },
          { index: 55, type: "table_caption", text: "表 2" },
          { index: 60, type: "table_caption", text: "表 3" },
          { index: 65, type: "table_caption", text: "表 4" },
        ],
      });

      expect(detections).toEqual([]);
    });
  });

  describe("mixed figure and table captions", () => {
    it("checks figures and tables independently", () => {
      const detections = detectCaptionNumberingContinuity({
        ...baseContext,
        structureItems: [
          { index: 10, type: "figure_caption", text: "图 1-1" },
          { index: 20, type: "table_caption", text: "表 1-1" },
          { index: 30, type: "figure_caption", text: "图 1-2" },
          { index: 40, type: "table_caption", text: "表 1-3" },  // table gap
          { index: 50, type: "figure_caption", text: "图 1-4" }, // figure gap
        ],
      });

      // Should detect gaps in both figure and table sequences
      expect(detections.length).toBe(2);

      const figureDetections = detections.filter((d) => d.snippet.startsWith("图"));
      const tableDetections = detections.filter((d) => d.snippet.startsWith("表"));
      expect(figureDetections.length).toBe(1);
      expect(tableDetections.length).toBe(1);
    });

    it("interleaved figures and tables with correct numbering pass", () => {
      const detections = detectCaptionNumberingContinuity({
        ...baseContext,
        structureItems: [
          { index: 10, type: "figure_caption", text: "图 1-1" },
          { index: 15, type: "table_caption", text: "表 1-1" },
          { index: 20, type: "figure_caption", text: "图 1-2" },
          { index: 25, type: "table_caption", text: "表 1-2" },
        ],
      });

      expect(detections).toEqual([]);
    });
  });

  describe("edge cases", () => {
    it("returns empty for no structure items", () => {
      const detections = detectCaptionNumberingContinuity({
        ...baseContext,
        structureItems: [],
      });
      expect(detections).toEqual([]);
    });

    it("returns empty for single caption", () => {
      const detections = detectCaptionNumberingContinuity({
        ...baseContext,
        structureItems: [
          { index: 10, type: "figure_caption", text: "图 1-1" },
        ],
      });
      expect(detections).toEqual([]);
    });

    it("handles unparseable caption text gracefully", () => {
      const detections = detectCaptionNumberingContinuity({
        ...baseContext,
        structureItems: [
          { index: 10, type: "figure_caption", text: "示意图：系统架构" },
          { index: 20, type: "figure_caption", text: "图片说明" },
        ],
      });

      // Neither parseable → no entries → no detections
      expect(detections).toEqual([]);
    });

    it("detects multiple gaps in different chapters", () => {
      const detections = detectCaptionNumberingContinuity({
        ...baseContext,
        structureItems: [
          { index: 10, type: "figure_caption", text: "图 1-1" },
          { index: 15, type: "figure_caption", text: "图 1-3" },  // gap in ch1
          { index: 20, type: "figure_caption", text: "图 2-1" },
          { index: 25, type: "figure_caption", text: "图 2-4" },  // gap in ch2
        ],
      });

      expect(detections.length).toBe(2);
    });

    it("handles Figure shorthand (Fig. 1-1)", () => {
      const detections = detectCaptionNumberingContinuity({
        ...baseContext,
        structureItems: [
          { index: 10, type: "figure_caption", text: "Fig. 1-1 Architecture" },
          { index: 15, type: "figure_caption", text: "Fig. 1-3 Data Flow" },  // gap
        ],
      });

      expect(detections.length).toBe(1);
    });

    it("handles captions without spaces (图1-1)", () => {
      const detections = detectCaptionNumberingContinuity({
        ...baseContext,
        structureItems: [
          { index: 10, type: "figure_caption", text: "图1-1 架构" },
          { index: 15, type: "figure_caption", text: "图1-2 拓扑" },
          { index: 20, type: "figure_caption", text: "图1-4 数据流" },  // gap
        ],
      });

      expect(detections.length).toBe(1);
    });
  });
});
