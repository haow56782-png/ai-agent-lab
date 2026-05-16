import { BODY_STYLE_RULE_ID, HEADING_SPACING_RULE_ID } from "./detectors/body-style.detector.js";
import { FIGURE_CAPTION_POSITION_V2_RULE_ID } from "./detectors/caption-position-v2.detector.js";
import { FIGURE_CAPTION_POSITION_RULE_ID, TABLE_CAPTION_POSITION_RULE_ID } from "./detectors/caption-position.detector.js";
import { FIGURE_DIRECTORY_RULE_ID } from "./detectors/figure-directory.detector.js";
import { FLOATING_OBJECT_OVERLAP_RULE_ID } from "./detectors/floating-object-overlap.detector.js";
import { FOOTER_ALIGNMENT_RULE_ID, FRONT_MATTER_ROMAN_RULE_ID } from "./detectors/footer-page-number.detector.js";
import { FOOTNOTE_STYLE_RULE_ID } from "./detectors/footnote-style.detector.js";
import { HEADING_HIERARCHY_RULE_ID } from "./detectors/heading-hierarchy.detector.js";
import { GUTTER_RULE_ID, PAGE_MARGIN_RULE_ID } from "./detectors/page-layout.detector.js";
import { PAGE_SECTION_RULE_ID } from "./detectors/page-section.detector.js";
import { REFERENCE_MISSING_DOI_RULE_ID } from "./detectors/reference-doi.detector.js";
import { TABLE_CONTINUATION_RULE_ID } from "./detectors/table-continuation.detector.js";
import { TABLE_KEEP_TOGETHER_RULE_ID } from "./detectors/table-keep-together.detector.js";
import { TOC_REFRESH_RULE_ID } from "./detectors/toc.detector.js";
import { SUB_SUP_SCRIPT_RULE_ID } from "./detectors/sub-sup-script.detector.js";
import { CAPTION_NUMBERING_CONTINUITY_RULE_ID } from "./detectors/caption-numbering-continuity.detector.js";
import type { CanonicalRuleMapping, ParsedDocumentContext, RuleDetection } from "./rule-types.js";

export const DETECTOR_TO_CANONICAL_RULE_ID: Record<string, string> = {
  [PAGE_MARGIN_RULE_ID]: "canonical_page_canvas_02",
  [GUTTER_RULE_ID]: "gutter_mm",
  [BODY_STYLE_RULE_ID]: "body_fonts",
  [HEADING_SPACING_RULE_ID]: "heading_before_pt",
  [HEADING_HIERARCHY_RULE_ID]: "canonical_heading_05",
  [FRONT_MATTER_ROMAN_RULE_ID]: "canonical_page_number_02",
  [FOOTER_ALIGNMENT_RULE_ID]: "canonical_header_footer_03",
  [PAGE_SECTION_RULE_ID]: "canonical_page_number_02",
  [FLOATING_OBJECT_OVERLAP_RULE_ID]: "canonical_figure_05",
  [TABLE_KEEP_TOGETHER_RULE_ID]: "canonical_table_05",
  [TABLE_CONTINUATION_RULE_ID]: "canonical_table_05",
  [FIGURE_CAPTION_POSITION_RULE_ID]: "canonical_figure_caption_01",
  [TABLE_CAPTION_POSITION_RULE_ID]: "canonical_table_caption_01",
  [FIGURE_CAPTION_POSITION_V2_RULE_ID]: "canonical_figure_caption_05",
  [FOOTNOTE_STYLE_RULE_ID]: "canonical_footnote_01",
  [REFERENCE_MISSING_DOI_RULE_ID]: "canonical_reference_06",
  [TOC_REFRESH_RULE_ID]: "canonical_toc_04",
  [FIGURE_DIRECTORY_RULE_ID]: "canonical_directory_field_02",
  [SUB_SUP_SCRIPT_RULE_ID]: "canonical_formula_01",
  [CAPTION_NUMBERING_CONTINUITY_RULE_ID]: "canonical_table_05",
};

export const CANONICAL_RULE_ID_EXEMPTIONS: Record<string, string> = {};

export function getCanonicalRuleCoverage(input: {
  detectorRuleIds: string[];
}): {
  covered: string[];
  exempted: Array<{ ruleId: string; reason: string }>;
  missing: string[];
} {
  const uniqueRuleIds = [...new Set(input.detectorRuleIds.filter(Boolean))];
  return {
    covered: uniqueRuleIds.filter((ruleId) => Boolean(DETECTOR_TO_CANONICAL_RULE_ID[ruleId])),
    exempted: uniqueRuleIds
      .filter((ruleId) => Boolean(CANONICAL_RULE_ID_EXEMPTIONS[ruleId]))
      .map((ruleId) => ({ ruleId, reason: CANONICAL_RULE_ID_EXEMPTIONS[ruleId] })),
    missing: uniqueRuleIds.filter((ruleId) => !DETECTOR_TO_CANONICAL_RULE_ID[ruleId] && !CANONICAL_RULE_ID_EXEMPTIONS[ruleId]),
  };
}

function getProfileRuleIds(profile: ParsedDocumentContext["profile"]): Set<string> {
  return new Set([
    ...((profile?.rules_json || []).map((rule: any) => String(rule?.ruleId || rule?.rule_id || "")).filter(Boolean)),
    ...((profile?.style_map || []).map((rule: any) => String(rule?.ruleId || rule?.rule_id || "")).filter(Boolean)),
  ]);
}

export function resolveCanonicalRuleId(input: {
  detectorRuleId: string;
  profile: ParsedDocumentContext["profile"];
}): string {
  return resolveCanonicalRuleMapping(input).resolvedRuleId;
}

export function resolveCanonicalRuleMapping(input: {
  detectorRuleId: string;
  profile: ParsedDocumentContext["profile"];
}): CanonicalRuleMapping {
  const canonicalRuleId = DETECTOR_TO_CANONICAL_RULE_ID[input.detectorRuleId];
  if (!canonicalRuleId) {
    return {
      detectorRuleId: input.detectorRuleId,
      resolvedRuleId: input.detectorRuleId,
      status: "missing_mapping",
      reason: `Detector rule ${input.detectorRuleId} has no canonical school_rules mapping; keeping detector rule id.`,
    };
  }

  const profileRuleIds = getProfileRuleIds(input.profile);
  if (profileRuleIds.size === 0) {
    return {
      detectorRuleId: input.detectorRuleId,
      canonicalRuleId,
      resolvedRuleId: input.detectorRuleId,
      status: "no_profile_rules",
      reason: `Selected profile has no materialized school_rules payload; keeping detector rule id ${input.detectorRuleId}.`,
    };
  }
  if (profileRuleIds.has(canonicalRuleId)) {
    return {
      detectorRuleId: input.detectorRuleId,
      canonicalRuleId,
      resolvedRuleId: canonicalRuleId,
      status: "mapped",
      reason: `Detector rule ${input.detectorRuleId} mapped to canonical school rule ${canonicalRuleId}.`,
    };
  }
  return {
    detectorRuleId: input.detectorRuleId,
    canonicalRuleId,
    resolvedRuleId: input.detectorRuleId,
    status: "missing_profile_rule",
    reason: `Selected profile does not include canonical school rule ${canonicalRuleId}; keeping detector rule id ${input.detectorRuleId} and snapshot will use finding_contract fallback.`,
  };
}

export function canonicalizeRuleDetections(input: {
  detections: RuleDetection[];
  profile: ParsedDocumentContext["profile"];
}): RuleDetection[] {
  return input.detections.map((detection) => {
    const detectorRuleId = detection.detectorRuleId || detection.ruleId;
    const canonicalMapping = resolveCanonicalRuleMapping({
      detectorRuleId,
      profile: input.profile,
    });
    return {
      ...detection,
      detectorRuleId,
      canonicalMapping,
      ruleId: canonicalMapping.resolvedRuleId,
    };
  });
}

export function detectionMatchesRuleId(detection: RuleDetection, ruleId: string): boolean {
  return detection.ruleId === ruleId || detection.detectorRuleId === ruleId;
}
