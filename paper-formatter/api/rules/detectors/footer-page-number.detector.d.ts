import type { FormatRuleDetector, ParsedDocumentContext, RuleDetection } from "../rule-types.js";
export declare const FRONT_MATTER_ROMAN_RULE_ID = "FRONT_MATTER_ROMAN_REVIEW";
export declare const FRONT_MATTER_ROMAN_LABEL = "\u524D\u7F6E\u9875 \u7F57\u9A6C";
export declare const FOOTER_ALIGNMENT_RULE_ID = "FOOTER_ALIGNMENT_REVIEW";
export declare const FOOTER_ALIGNMENT_LABEL = "\u9875\u811A\u5C45\u4E2D";
export declare function detectFooterPageNumber(ctx: ParsedDocumentContext): RuleDetection[];
export declare const footerPageNumberDetector: FormatRuleDetector;
