import { describe, expect, it } from "vitest";
import { buildFindingsFromDetections } from "../src/rules/builders/finding-builder.js";
import { buildRuleDetailsFromDetections } from "../src/rules/builders/rule-detail-builder.js";
import { detectFloatingObjectOverlap } from "../src/rules/detectors/floating-object-overlap.detector.js";
import { detectTableKeepTogether } from "../src/rules/detectors/table-keep-together.detector.js";
import { sortDetectionsByPriority } from "../src/rules/priority.js";
import { resolveCanonicalProfileSeed } from "../src/fixtures/canonical-school-profiles.js";
import { runFormatRuleDetectors } from "../src/rules/rule-registry.js";

const doc = {
  canonical_document_id: "doc-canonical",
} as any;

const sections = [{
  page_width_cm: 21,
  margin_left_mm: 30,
  margin_right_mm: 25,
  margin_top_mm: 25,
  margin_bottom_mm: 20,
}];

const paragraphs = [
  { text: "兰州大学本科生毕业论文（设计）撰写格式，根据学位论文编写的相关标准，特制定本规范。", runs: [{ size_pt: 12 }], spacing: { line_spacing: 1.5 } },
  { text: "参考文献著录需要进一步检查。", runs: [{ size_pt: 12 }], spacing: { line_spacing: 1.5 } },
];

describe("analyze job regression", () => {
  it("does not synthesize fixed demo warnings or RULE-L2 findings when detectors return no hits", () => {
    const ruleDetails = buildRuleDetailsFromDetections({ sections, paragraphs, detections: [] });
    const findings = buildFindingsFromDetections({
      doc,
      profileId: "sch-001",
      detections: [],
    });

    const warningLabels = ruleDetails.flatMap((group) => group.items)
      .filter((item) => Array.isArray(item) ? item[1] === "warn" : item.status === "warn")
      .map((item) => Array.isArray(item) ? item[0] : item.label);

    expect(warningLabels).toEqual([]);
    expect(findings).toEqual([]);
    expect(JSON.stringify(ruleDetails)).not.toContain("RULE-L2");
    expect(JSON.stringify(ruleDetails)).not.toContain("当前规则命中位置需要人工复核");
  });

  it("prioritizes 图片/印章覆盖正文 over keep-together in ruleDetails and findings", () => {
    const detectorDetections = sortDetectionsByPriority([
      ...detectFloatingObjectOverlap({
        doc,
        profileId: "sch-001",
        paragraphs,
        sections,
        tables: [{ index: 0, rows: 10, cols: 4, data: [{ cells: ["表格内容过长，需要复核跨页布局"] }] }],
        headings: [],
        structureItems: [],
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
          description: "学院印章",
          is_watermark_like: true,
        }],
      }),
      ...detectTableKeepTogether({
        doc,
        profileId: "sch-001",
        paragraphs,
        sections,
        tables: [{ index: 0, rows: 10, cols: 4, data: [{ cells: ["表格内容过长，需要复核跨页布局"] }] }],
        headings: [],
        structureItems: [],
        images: [],
      }),
    ]);

    const ruleDetails = buildRuleDetailsFromDetections({ sections, paragraphs, detections: detectorDetections });
    const findings = buildFindingsFromDetections({
      doc,
      profileId: "sch-001",
      detections: detectorDetections,
    });

    const figureGroup = ruleDetails.find((group) => group.cat === "图表 & 题注");
    const firstItem = figureGroup?.items[0];
    expect(Array.isArray(firstItem) ? firstItem[0] : firstItem?.label).toBe("图片/印章覆盖正文");
    expect(findings.some((finding) => finding.rule_id === "FLOATING_OBJECT_OVERLAP_TEXT")).toBe(true);
    expect(findings[0].severity).toBe("P1");
  });

  it("runs analyze detectors with the approved Donghua canonical profile", () => {
    const dhu = resolveCanonicalProfileSeed("东华大学");
    expect(dhu).toMatchObject({ schoolId: "dhu", name: "东华大学" });

    const detections = runFormatRuleDetectors({
      doc,
      profile: {
        school_id: "dhu",
        rules_json: dhu?.rulesJson || [],
        style_map: dhu?.styleMap || [],
      },
      profileId: "dhu",
      paragraphs,
      sections: [{
        page_width_cm: 21,
        margin_left_mm: 18,
        margin_right_mm: 18,
        margin_top_mm: 18,
        margin_bottom_mm: 18,
        gutter_mm: 0,
      }],
      tables: [],
      headings: [],
      structureItems: [],
      images: [],
    });

    expect(detections.some((detection) => detection.ruleId === "PAGE_MARGIN_REVIEW")).toBe(true);
    expect(detections.every((detection) => detection.snippet.trim().length > 0)).toBe(true);
  });
});
