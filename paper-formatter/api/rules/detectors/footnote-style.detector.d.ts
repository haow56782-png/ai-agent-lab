import type { FormatRuleDetector, ParsedDocumentContext, RuleDetection } from "../rule-types.js";
export declare const FOOTNOTE_STYLE_RULE_ID = "FOOTNOTE_STYLE_NOT_ALLOWED";
export declare const FOOTNOTE_STYLE_LABEL = "\u811A\u6CE8\u6837\u5F0F\u4E0D\u5728\u767D\u540D\u5355";
export declare function detectFootnoteStyleIssues(ctx: ParsedDocumentContext): RuleDetection[];
export declare const footnoteStyleDetector: FormatRuleDetector;
