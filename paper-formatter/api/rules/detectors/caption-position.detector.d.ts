import type { FormatRuleDetector, ParsedDocumentContext, RuleDetection } from "../rule-types.js";
export declare const FIGURE_CAPTION_POSITION_RULE_ID = "FIGURE_CAPTION_POSITION_REVIEW";
export declare const FIGURE_CAPTION_POSITION_LABEL = "\u56FE\u9898\u5C45\u4E0B\u5C45\u4E2D";
export declare const TABLE_CAPTION_POSITION_RULE_ID = "TABLE_CAPTION_POSITION_REVIEW";
export declare const TABLE_CAPTION_POSITION_LABEL = "\u8868\u9898\u5C45\u4E0A";
export declare function detectCaptionPosition(ctx: ParsedDocumentContext): RuleDetection[];
export declare const captionPositionDetector: FormatRuleDetector;
