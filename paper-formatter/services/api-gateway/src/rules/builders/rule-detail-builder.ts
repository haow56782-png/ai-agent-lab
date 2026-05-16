import type { JobRuleDetail, JobRuleHitItem } from "../../../../../packages/shared-types/src/job-contract";
import { detectionMatchesRuleId } from "../canonical-rule-map.js";
import { FIGURE_CAPTION_POSITION_LABEL, FIGURE_CAPTION_POSITION_RULE_ID, TABLE_CAPTION_POSITION_LABEL, TABLE_CAPTION_POSITION_RULE_ID } from "../detectors/caption-position.detector.js";
import { BODY_STYLE_LABEL, BODY_STYLE_RULE_ID, HEADING_SPACING_LABEL, HEADING_SPACING_RULE_ID } from "../detectors/body-style.detector.js";
import { FOOTER_ALIGNMENT_LABEL, FOOTER_ALIGNMENT_RULE_ID, FRONT_MATTER_ROMAN_LABEL, FRONT_MATTER_ROMAN_RULE_ID } from "../detectors/footer-page-number.detector.js";
import { FIGURE_DIRECTORY_LABEL, FIGURE_DIRECTORY_RULE_ID } from "../detectors/figure-directory.detector.js";
import { FLOATING_OBJECT_OVERLAP_LABEL, FLOATING_OBJECT_OVERLAP_RULE_ID } from "../detectors/floating-object-overlap.detector.js";
import { FOOTNOTE_STYLE_LABEL, FOOTNOTE_STYLE_RULE_ID } from "../detectors/footnote-style.detector.js";
import { HEADING_HIERARCHY_LABEL, HEADING_HIERARCHY_RULE_ID } from "../detectors/heading-hierarchy.detector.js";
import { PAGE_SECTION_LABEL, PAGE_SECTION_RULE_ID } from "../detectors/page-section.detector.js";
import { GUTTER_LABEL, GUTTER_RULE_ID, PAGE_MARGIN_LABEL, PAGE_MARGIN_RULE_ID } from "../detectors/page-layout.detector.js";
import { REFERENCE_MISSING_DOI_LABEL, REFERENCE_MISSING_DOI_RULE_ID } from "../detectors/reference-doi.detector.js";
import { TABLE_KEEP_TOGETHER_LABEL, TABLE_KEEP_TOGETHER_RULE_ID } from "../detectors/table-keep-together.detector.js";
import { TOC_REFRESH_LABEL, TOC_REFRESH_RULE_ID } from "../detectors/toc.detector.js";
import type { RuleDetection } from "../rule-types.js";

function detectionToRuleHitItem(detection: RuleDetection): JobRuleHitItem {
  return {
    ruleId: detection.ruleId,
    label: detection.label,
    status: detection.severity === "P0" || detection.severity === "P1" ? "warn" : "warn",
    location: {
      pageIndex: Math.max(0, detection.page - 1),
      bbox: detection.evidence?.bbox,
    },
  };
}

function findDetectionItems(detections: RuleDetection[], ruleIds: string[]): JobRuleHitItem[] {
  const ruleIdSet = new Set(ruleIds);
  return detections
    .filter((detection) => [...ruleIdSet].some((ruleId) => detectionMatchesRuleId(detection, ruleId)))
    .map(detectionToRuleHitItem);
}

function createDefaultFigureItems(detections: RuleDetection[]): Array<JobRuleHitItem | [string, "pass" | "warn"]> {
  const overlapItems = findDetectionItems(detections, [FLOATING_OBJECT_OVERLAP_RULE_ID]);
  const tableItems = findDetectionItems(detections, [TABLE_KEEP_TOGETHER_RULE_ID]);
  const captionItems = findDetectionItems(detections, [FIGURE_CAPTION_POSITION_RULE_ID, TABLE_CAPTION_POSITION_RULE_ID]);
  return [
    ...overlapItems,
    ...tableItems,
    ...(captionItems.length > 0 ? captionItems : [
      [FIGURE_CAPTION_POSITION_LABEL, "pass"] as [string, "pass" | "warn"],
      [TABLE_CAPTION_POSITION_LABEL, "pass"] as [string, "pass" | "warn"],
    ]),
    ...(tableItems.length === 0 ? [[TABLE_KEEP_TOGETHER_LABEL, "pass"] as [string, "pass" | "warn"]] : []),
  ];
}

export function buildRuleDetailsFromDetections(input: {
  sections: any[];
  paragraphs: any[];
  detections: RuleDetection[];
}): JobRuleDetail[] {
  const { sections, paragraphs, detections } = input;
  const pageItems = findDetectionItems(detections, [PAGE_MARGIN_RULE_ID, GUTTER_RULE_ID]);
  const figureItems = createDefaultFigureItems(detections);
  const styleItems = findDetectionItems(detections, [BODY_STYLE_RULE_ID, HEADING_SPACING_RULE_ID, HEADING_HIERARCHY_RULE_ID, FOOTNOTE_STYLE_RULE_ID]);
  const sectionItems = findDetectionItems(detections, [FRONT_MATTER_ROMAN_RULE_ID, PAGE_SECTION_RULE_ID, FOOTER_ALIGNMENT_RULE_ID]);
  const tocItems = findDetectionItems(detections, [TOC_REFRESH_RULE_ID, FIGURE_DIRECTORY_RULE_ID]);
  const referenceItems = findDetectionItems(detections, [REFERENCE_MISSING_DOI_RULE_ID]);

  return [
    {
      cat: "页面",
      items: pageItems.length > 0
        ? pageItems
        : (() => {
            if (sections.length > 0) {
              const s = sections[0];
              return [
                [`${PAGE_MARGIN_LABEL} ${s.margin_top_mm}/${s.margin_bottom_mm}/${s.margin_left_mm}/${s.margin_right_mm} mm`, "pass"] as [string, "pass" | "warn"],
                [GUTTER_LABEL, "pass"] as [string, "pass" | "warn"],
              ];
            }
            return [
              [PAGE_MARGIN_LABEL, "pass"] as [string, "pass" | "warn"],
              [GUTTER_LABEL, "pass"] as [string, "pass" | "warn"],
            ];
          })(),
    },
    {
      cat: "样式",
      items: [
        ...(styleItems.length > 0
          ? styleItems
          : [
              [BODY_STYLE_LABEL, "pass"] as [string, "pass" | "warn"],
              [HEADING_SPACING_LABEL, "pass"] as [string, "pass" | "warn"],
              [HEADING_HIERARCHY_LABEL, "pass"] as [string, "pass" | "warn"],
              [FOOTNOTE_STYLE_LABEL, "pass"] as [string, "pass" | "warn"],
            ]),
      ],
    },
    {
      cat: "分节 & 页码",
      items: [
        ...(sectionItems.length > 0
          ? sectionItems
          : [
              [FRONT_MATTER_ROMAN_LABEL, "pass"] as [string, "pass" | "warn"],
              [PAGE_SECTION_LABEL, "pass"] as [string, "pass" | "warn"],
              [FOOTER_ALIGNMENT_LABEL, "pass"] as [string, "pass" | "warn"],
            ]),
      ],
    },
    { cat: "图表 & 题注", items: figureItems },
    {
      cat: "目录 & 域",
      items: [
        ...(tocItems.length > 0
          ? tocItems
          : [
              [TOC_REFRESH_LABEL, "pass"] as [string, "pass" | "warn"],
              [FIGURE_DIRECTORY_LABEL, "pass"] as [string, "pass" | "warn"],
            ]),
      ],
    },
    {
      cat: "参考文献",
      items: [
        ["GB/T 7714-2015 体例", "pass"],
        ["悬挂缩进", "pass"],
        ...(referenceItems.length > 0 ? referenceItems : [[REFERENCE_MISSING_DOI_LABEL, "pass"] as [string, "pass" | "warn"]]),
      ],
    },
  ];
}

export { FLOATING_OBJECT_OVERLAP_LABEL, FLOATING_OBJECT_OVERLAP_RULE_ID };
