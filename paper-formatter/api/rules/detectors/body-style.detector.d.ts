import type { FormatRuleDetector, ParsedDocumentContext, RuleDetection } from "../rule-types.js";
export declare const BODY_STYLE_RULE_ID = "BODY_STYLE_REVIEW";
export declare const BODY_STYLE_LABEL = "\u6B63\u6587\u5B57\u4F53\u69FD \u5B8B\u4F53/Times";
export declare const HEADING_SPACING_RULE_ID = "HEADING_SPACING_REVIEW";
export declare const HEADING_SPACING_LABEL = "\u4E00\u7EA7\u6807\u9898 \u6BB5\u524D24 \u6BB5\u540E18";
export declare function detectBodyStyle(ctx: ParsedDocumentContext): RuleDetection[];
export declare function detectHeadingSpacing(ctx: ParsedDocumentContext): RuleDetection[];
export declare const bodyStyleDetector: FormatRuleDetector;
export declare const headingSpacingDetector: FormatRuleDetector;
