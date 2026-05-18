import type { FormatRuleDetector, ParsedDocumentContext, RuleDetection } from "../rule-types.js";
export declare const PAGE_MARGIN_RULE_ID = "PAGE_MARGIN_REVIEW";
export declare const PAGE_MARGIN_LABEL = "\u9875\u8FB9\u8DDD";
export declare const GUTTER_RULE_ID = "GUTTER_REVIEW";
export declare const GUTTER_LABEL = "\u88C5\u8BA2\u7EBF 0";
export declare function detectPageLayout(ctx: ParsedDocumentContext): RuleDetection[];
export declare const pageMarginDetector: FormatRuleDetector;
