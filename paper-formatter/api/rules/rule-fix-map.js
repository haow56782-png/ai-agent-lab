import { FIGURE_CAPTION_POSITION_RULE_ID, TABLE_CAPTION_POSITION_RULE_ID } from "./detectors/caption-position.detector.js";
import { BODY_STYLE_RULE_ID, HEADING_SPACING_RULE_ID } from "./detectors/body-style.detector.js";
import { FOOTER_ALIGNMENT_RULE_ID, FRONT_MATTER_ROMAN_RULE_ID } from "./detectors/footer-page-number.detector.js";
import { FIGURE_DIRECTORY_RULE_ID } from "./detectors/figure-directory.detector.js";
import { FLOATING_OBJECT_OVERLAP_RULE_ID } from "./detectors/floating-object-overlap.detector.js";
import { FOOTNOTE_STYLE_RULE_ID } from "./detectors/footnote-style.detector.js";
import { HEADING_HIERARCHY_RULE_ID } from "./detectors/heading-hierarchy.detector.js";
import { PAGE_SECTION_RULE_ID } from "./detectors/page-section.detector.js";
import { GUTTER_RULE_ID, PAGE_MARGIN_RULE_ID } from "./detectors/page-layout.detector.js";
import { REFERENCE_MISSING_DOI_RULE_ID } from "./detectors/reference-doi.detector.js";
import { TABLE_KEEP_TOGETHER_RULE_ID } from "./detectors/table-keep-together.detector.js";
import { TOC_REFRESH_RULE_ID } from "./detectors/toc.detector.js";
import { SUB_SUP_SCRIPT_RULE_ID } from "./detectors/sub-sup-script.detector.js";
import { CAPTION_NUMBERING_CONTINUITY_RULE_ID } from "./detectors/caption-numbering-continuity.detector.js";
export const RULE_ID_TO_FIX_TYPES = {
    [FLOATING_OBJECT_OVERLAP_RULE_ID]: ["image_format"],
    canonical_figure_05: ["image_format"],
    [PAGE_MARGIN_RULE_ID]: ["margin"],
    canonical_page_canvas_02: ["margin"],
    [GUTTER_RULE_ID]: ["margin"],
    gutter_mm: ["margin"],
    [BODY_STYLE_RULE_ID]: ["body_style"],
    body_fonts: ["body_style"],
    [HEADING_SPACING_RULE_ID]: ["heading", "body_style"],
    heading_before_pt: ["heading", "body_style"],
    [FRONT_MATTER_ROMAN_RULE_ID]: ["page_number"],
    canonical_page_number_02: ["page_number"],
    [FOOTER_ALIGNMENT_RULE_ID]: ["header_footer", "page_number"],
    canonical_header_footer_03: ["header_footer", "page_number"],
    [TABLE_KEEP_TOGETHER_RULE_ID]: ["table_format", "caption"],
    canonical_table_05: ["caption", "table_format", "image_format"],
    [FIGURE_CAPTION_POSITION_RULE_ID]: ["caption"],
    canonical_figure_caption_01: ["caption"],
    [TABLE_CAPTION_POSITION_RULE_ID]: ["caption", "table_format"],
    canonical_table_caption_01: ["caption", "table_format"],
    [FOOTNOTE_STYLE_RULE_ID]: ["body_style"],
    canonical_footnote_01: ["body_style"],
    [REFERENCE_MISSING_DOI_RULE_ID]: ["reference_format"],
    canonical_reference_06: ["reference_format"],
    [TOC_REFRESH_RULE_ID]: ["toc", "page_number"],
    canonical_toc_04: ["toc", "page_number"],
    [HEADING_HIERARCHY_RULE_ID]: ["heading"],
    canonical_heading_05: ["heading"],
    [PAGE_SECTION_RULE_ID]: ["page_number"],
    [FIGURE_DIRECTORY_RULE_ID]: ["toc", "caption"],
    canonical_directory_field_02: ["toc", "caption"],
    [SUB_SUP_SCRIPT_RULE_ID]: ["body_style"],
    canonical_formula_01: ["body_style"],
    [CAPTION_NUMBERING_CONTINUITY_RULE_ID]: ["caption", "table_format", "image_format"],
};
export function ruleMatchesFixType(ruleId, fixType) {
    if (!ruleId)
        return false;
    return (RULE_ID_TO_FIX_TYPES[ruleId] || []).includes(fixType);
}
