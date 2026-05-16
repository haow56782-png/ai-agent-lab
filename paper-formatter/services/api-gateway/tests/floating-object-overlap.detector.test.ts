import { describe, expect, it } from "vitest";
import { detectFloatingObjectOverlap } from "../src/rules/detectors/floating-object-overlap.detector.js";

const doc = {
  canonical_document_id: "doc-canonical",
} as any;

const baseContext = {
  doc,
  profileId: "sch-001",
  sections: [{
    page_width_cm: 21,
    margin_left_mm: 30,
    margin_right_mm: 25,
  }],
  tables: [],
  headings: [],
  structureItems: [],
};

const paragraphs = [
  { text: "兰州大学本科生毕业论文（设计）撰写格式，根据学位论文编写的相关标准，特制定本规范。", runs: [{ size_pt: 12 }], spacing: { line_spacing: 1.5 } },
  { text: "普通配图独占一行，不会压住正文。", runs: [{ size_pt: 12 }], spacing: { line_spacing: 1.5 } },
];

describe("floating object overlap detector", () => {
  it("returns FLOATING_OBJECT_OVERLAP_TEXT for floating image overlapping nearby text", () => {
    const detections = detectFloatingObjectOverlap({
      ...baseContext,
      paragraphs,
      images: [{
        paragraph_index: 0,
        paragraph_text: paragraphs[0].text,
        width_pt: 96,
        height_pt: 96,
        object_type: "floating",
        wrap_type: "wrapNone",
        behind_text: false,
        allow_overlap: true,
        overlap_risk: true,
        name: "红色印章",
      }],
    });

    expect(detections).toHaveLength(1);
    expect(detections[0].ruleId).toBe("FLOATING_OBJECT_OVERLAP_TEXT");
    expect(detections[0].severity).toBe("P1");
    expect(detections[0].evidence?.objectName).toBe("红色印章");
  });

  it("returns nothing when object is already behind text", () => {
    const detections = detectFloatingObjectOverlap({
      ...baseContext,
      paragraphs,
      images: [{
        paragraph_index: 0,
        paragraph_text: paragraphs[0].text,
        width_pt: 120,
        height_pt: 120,
        object_type: "floating",
        behind_text: true,
        allow_overlap: true,
        overlap_risk: true,
      }],
    });

    expect(detections).toHaveLength(0);
  });

  it("returns nothing when object is not floating", () => {
    const detections = detectFloatingObjectOverlap({
      ...baseContext,
      paragraphs,
      images: [{
        paragraph_index: 1,
        paragraph_text: paragraphs[1].text,
        width_pt: 180,
        height_pt: 120,
        object_type: "inline",
        behind_text: false,
        allow_overlap: false,
        overlap_risk: false,
      }],
    });

    expect(detections).toHaveLength(0);
  });

  it("returns nothing when overlap ratio is below threshold", () => {
    const detections = detectFloatingObjectOverlap({
      ...baseContext,
      paragraphs,
      images: [{
        paragraph_index: 0,
        paragraph_text: paragraphs[0].text,
        width_pt: 12,
        height_pt: 12,
        object_type: "floating",
        behind_text: false,
        allow_overlap: true,
        overlap_risk: true,
      }],
    });

    expect(detections).toHaveLength(0);
  });

  it("returns nothing when snippet is unavailable", () => {
    const detections = detectFloatingObjectOverlap({
      ...baseContext,
      paragraphs: [],
      images: [{
        paragraph_index: 0,
        paragraph_text: "",
        width_pt: 96,
        height_pt: 96,
        object_type: "floating",
        behind_text: false,
        allow_overlap: true,
        overlap_risk: true,
      }],
    });

    expect(detections).toHaveLength(0);
  });
});
