import { describe, expect, it } from "vitest";
import {
  detectSubSupScript,
  SUB_SUP_SCRIPT_RULE_ID,
} from "../src/rules/detectors/sub-sup-script.detector.js";

const baseContext = {
  doc: { canonical_document_id: "doc-sub" } as any,
  profileId: "sch-001",
  sections: [{ page_width_cm: 21, margin_left_mm: 30, margin_right_mm: 25 }],
  images: [],
  tables: [],
  structureItems: [],
};

describe("sub-sup-script detector", () => {
  describe("chemical subscript detection", () => {
    it("flags chemical formula without subscript formatting", () => {
      const detections = detectSubSupScript({
        ...baseContext,
        paragraphs: [
          {
            index: 5,
            text: "根据实验数据，其化学式为H2O和CO2，反应过程中生成Fe3O4与SO2。这些化合物的结构需要进一步分析。",
            runs: [
              { text: "根据实验数据，其化学式为H2O和CO2，反应过程中生成Fe3O4与SO2。这些化合物的结构需要进一步分析。", subscript: false, superscript: false, name: "宋体", size_pt: 12 },
            ],
          },
        ],
        headings: [],
      });

      expect(detections.length).toBeGreaterThanOrEqual(1);
      expect(detections[0].ruleId).toBe(SUB_SUP_SCRIPT_RULE_ID);
      expect(detections[0].label).toContain("下标");
      expect(detections[0].suggestion.explanation).toContain("H₂O");
    });

    it("does not flag chemical formula with correct subscript", () => {
      const detections = detectSubSupScript({
        ...baseContext,
        paragraphs: [
          {
            index: 5,
            text: "其化学式为H2O",
            runs: [
              { text: "其化学式为", subscript: false, superscript: false, name: "宋体", size_pt: 12 },
              { text: "H", subscript: false, superscript: false, name: "Times New Roman", size_pt: 12 },
              { text: "2", subscript: true, superscript: false, name: "Times New Roman", size_pt: 8 },
              { text: "O", subscript: false, superscript: false, name: "Times New Roman", size_pt: 12 },
            ],
          },
        ],
        headings: [],
      });

      // When runs use proper subscript, no detection should fire
      // (the detector checks each run; run with subscript=true is skipped)
      const chemicalDetections = detections.filter((d) =>
        d.suggestion.explanation.includes("下标"),
      );
      expect(chemicalDetections.length).toBe(0);
    });

    it("flags chemical formula with missing subscript in multi-run paragraph", () => {
      const detections = detectSubSupScript({
        ...baseContext,
        paragraphs: [
          {
            index: 10,
            text: "化合物NaCl与K2SO4混合",
            runs: [
              { text: "化合物NaCl与", subscript: false, superscript: false, name: "宋体", size_pt: 12 },
              { text: "K2SO4", subscript: false, superscript: false, name: "Times New Roman", size_pt: 12 },
              { text: "混合", subscript: false, superscript: false, name: "宋体", size_pt: 12 },
            ],
          },
        ],
        headings: [],
      });

      const chemicalDetections = detections.filter((d) =>
        d.suggestion.explanation.includes("化学"),
      );
      expect(chemicalDetections.length).toBeGreaterThanOrEqual(1);
      expect(chemicalDetections[0].label).toContain("下标");
    });

    it("does not flag headings with element patterns", () => {
      const detections = detectSubSupScript({
        ...baseContext,
        paragraphs: [
          {
            index: 0,
            text: "2.3 H2O分子结构分析",
            runs: [{ text: "2.3 H2O分子结构分析", subscript: false, superscript: false, name: "黑体", size_pt: 16 }],
          },
        ],
        headings: [{ index: 0, text: "2.3 H2O分子结构分析" }],
      });

      const chemicalDetections = detections.filter((d) =>
        d.suggestion.explanation.includes("下标"),
      );
      expect(chemicalDetections.length).toBe(0);
    });

    it("requires at least 1 KNOWN-element match in single-run paragraphs", () => {
      const detections = detectSubSupScript({
        ...baseContext,
        paragraphs: [
          {
            index: 5,
            text: "使用A4纸张，模型编号iPhone15。",  // A4 and 15 are not chemical elements
            runs: [
              { text: "使用A4纸张，模型编号iPhone15。", subscript: false, superscript: false, name: "宋体", size_pt: 12 },
            ],
          },
        ],
        headings: [],
      });

      // A4 is not a known chemical element, so no detection
      const chemicalDetections = detections.filter((d) =>
        d.suggestion.explanation.includes("下标"),
      );
      expect(chemicalDetections.length).toBe(0);
    });
  });

  describe("unit superscript detection", () => {
    it("flags m2 as missing superscript in body text", () => {
      const detections = detectSubSupScript({
        ...baseContext,
        paragraphs: [
          {
            index: 8,
            text: "实验室面积为120 m2，总容积为360 m3。",
            runs: [
              { text: "实验室面积为120 m2，总容积为360 m3。", subscript: false, superscript: false, name: "宋体", size_pt: 12 },
            ],
          },
        ],
        headings: [],
      });

      const unitDetections = detections.filter((d) =>
        d.suggestion.explanation.includes("m²"),
      );
      expect(unitDetections.length).toBe(1);
      expect(unitDetections[0].label).toContain("上标");
      expect(unitDetections[0].severity).toBe("P1");
    });

    it("flags cm2, mm2, km2 in body text", () => {
      const detections = detectSubSupScript({
        ...baseContext,
        paragraphs: [
          {
            index: 9,
            text: "占地面积500 cm2，厚度2 mm2截面。",
            runs: [
              { text: "占地面积500 cm2，", subscript: false, superscript: false, name: "宋体", size_pt: 12 },
              { text: "厚度2 mm2截面。", subscript: false, superscript: false, name: "宋体", size_pt: 12 },
            ],
          },
        ],
        headings: [],
      });

      const unitDetections = detections.filter((d) =>
        d.suggestion.explanation.includes("上标"),
      );
      expect(unitDetections.length).toBeGreaterThanOrEqual(1);
    });

    it("does not flag units already in superscript", () => {
      const detections = detectSubSupScript({
        ...baseContext,
        paragraphs: [
          {
            index: 8,
            text: "面积为120 m2",
            runs: [
              { text: "面积为120 m", subscript: false, superscript: false, name: "宋体", size_pt: 12 },
              { text: "2", subscript: false, superscript: true, name: "Times New Roman", size_pt: 8 },
            ],
          },
        ],
        headings: [],
      });

      const unitDetections = detections.filter((d) =>
        d.suggestion.explanation.includes("上标"),
      );
      expect(unitDetections.length).toBe(0);
    });
  });

  describe("citation superscript detection", () => {
    it("flags citation marker [1] not in superscript", () => {
      const detections = detectSubSupScript({
        ...baseContext,
        paragraphs: [
          {
            index: 15,
            text: "相关研究表明该方法有效[1]。此外，有学者提出改进方案[2,3]。",
            runs: [
              { text: "相关研究表明该方法有效", subscript: false, superscript: false, name: "宋体", size_pt: 12 },
              { text: "[1]", subscript: false, superscript: false, name: "Times New Roman", size_pt: 12 },
              { text: "。此外，有学者提出改进方案", subscript: false, superscript: false, name: "宋体", size_pt: 12 },
              { text: "[2,3]", subscript: false, superscript: false, name: "Times New Roman", size_pt: 12 },
              { text: "。", subscript: false, superscript: false, name: "宋体", size_pt: 12 },
            ],
          },
        ],
        headings: [],
      });

      const citationDetections = detections.filter((d) =>
        d.suggestion.explanation.includes("引用"),
      );
      expect(citationDetections.length).toBe(2);
      expect(citationDetections[0].severity).toBe("P1");
    });

    it("does not flag citation in reference section", () => {
      const detections = detectSubSupScript({
        ...baseContext,
        paragraphs: [
          {
            index: 30,
            text: "[1] Zhang Y. Example paper. Nature, 2025.",
            runs: [
              { text: "[1] Zhang Y. Example paper. Nature, 2025.", subscript: false, superscript: false, name: "Times New Roman", size_pt: 10 },
            ],
          },
        ],
        headings: [],
        structureItems: [
          { index: 30, type: "reference_entry", text: "[1] Zhang Y. Example paper. Nature, 2025." },
        ],
      });

      const citationDetections = detections.filter((d) =>
        d.suggestion.explanation.includes("引用"),
      );
      expect(citationDetections.length).toBe(0);
    });

    it("skips isolated bracket numbers without body context", () => {
      const detections = detectSubSupScript({
        ...baseContext,
        paragraphs: [
          {
            index: 40,
            text: "[1]",
            runs: [
              { text: "[1]", subscript: false, superscript: false, name: "Times New Roman", size_pt: 12 },
            ],
          },
        ],
        headings: [],
        structureItems: [],
      });

      // [1] alone without surrounding body text should not be flagged
      const citationDetections = detections.filter((d) =>
        d.suggestion.explanation.includes("引用"),
      );
      expect(citationDetections.length).toBe(0);
    });

    it("flags citation [1-3] with range", () => {
      const detections = detectSubSupScript({
        ...baseContext,
        paragraphs: [
          {
            index: 16,
            text: "多项研究证实了这一点[1-3]。",
            runs: [
              { text: "多项研究证实了这一点", subscript: false, superscript: false, name: "宋体", size_pt: 12 },
              { text: "[1-3]", subscript: false, superscript: false, name: "Times New Roman", size_pt: 12 },
              { text: "。", subscript: false, superscript: false, name: "宋体", size_pt: 12 },
            ],
          },
        ],
        headings: [],
      });

      const citationDetections = detections.filter((d) =>
        d.suggestion.explanation.includes("引用") && d.snippet.includes("[1-3]"),
      );
      expect(citationDetections.length).toBe(1);
    });
  });

  describe("edge cases", () => {
    it("returns empty for paragraphs with no text", () => {
      const detections = detectSubSupScript({
        ...baseContext,
        paragraphs: [
          { index: 0, text: "", runs: [] },
        ],
        headings: [],
      });
      expect(detections).toEqual([]);
    });

    it("skips empty input gracefully", () => {
      const detections = detectSubSupScript({
        ...baseContext,
        paragraphs: [],
        headings: [],
      });
      expect(detections).toEqual([]);
    });

    it("handles paragraphs with runs but without subscript/superscript fields", () => {
      const detections = detectSubSupScript({
        ...baseContext,
        paragraphs: [
          {
            index: 5,
            text: "化学式H2O和CO2",
            runs: [
              { text: "化学式H2O和CO2", name: "宋体", size_pt: 12 },
            ],
          },
        ],
        headings: [],
      });

      // Missing subscript/superscript fields default to falsy → should flag
      const chemicalDetections = detections.filter((d) =>
        d.suggestion.explanation.includes("下标"),
      );
      expect(chemicalDetections.length).toBeGreaterThanOrEqual(1);
    });
  });
});
