import type { FormatRuleDetector, ParsedDocumentContext, RuleDetection } from "../rule-types.js";
export declare const PAGE_SECTION_RULE_ID = "PAGE_SECTION_REVIEW";
export declare const PAGE_SECTION_LABEL = "\u6B63\u6587\u963F\u62C9\u4F2F 1 \u8D77";
export declare function detectPageSectionReview(ctx: ParsedDocumentContext): RuleDetection[];
export declare const pageSectionDetector: FormatRuleDetector;
