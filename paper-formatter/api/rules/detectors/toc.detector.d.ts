import type { FormatRuleDetector, ParsedDocumentContext, RuleDetection } from "../rule-types.js";
export declare const TOC_REFRESH_RULE_ID = "TOC_REFRESH_REVIEW";
export declare const TOC_REFRESH_LABEL = "\u81EA\u52A8\u76EE\u5F55\u5237\u65B0";
export declare function detectTocRefreshReview(ctx: ParsedDocumentContext): RuleDetection[];
export declare const tocRefreshDetector: FormatRuleDetector;
