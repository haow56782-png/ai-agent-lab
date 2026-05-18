import type { FormatRuleDetector, ParsedDocumentContext, RuleDetection } from "../rule-types.js";
export declare const CAPTION_NUMBERING_CONTINUITY_RULE_ID = "CAPTION_NUMBERING_CONTINUITY";
export declare const CAPTION_NUMBERING_CONTINUITY_LABEL = "\u56FE\u8868\u7F16\u53F7\u8FDE\u7EED\u6027\u68C0\u67E5";
/**
 * Detects caption numbering continuity issues (gaps and duplicates)
 * for both figure captions (图题) and table captions (表题).
 *
 * Scans the structure items for figure_caption and table_caption entries,
 * parses their numbering, and checks for gaps or duplicates within each
 * numbering group (per-chapter or global).
 */
export declare function detectCaptionNumberingContinuity(ctx: ParsedDocumentContext): RuleDetection[];
export declare const captionNumberingContinuityDetector: FormatRuleDetector;
