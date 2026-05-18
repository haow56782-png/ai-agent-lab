import type { FormatRuleDetector, ParsedDocumentContext, RuleDetection } from "../rule-types.js";
export declare const HEADING_HIERARCHY_RULE_ID = "HEADING_HIERARCHY_REVIEW";
export declare const HEADING_HIERARCHY_LABEL = "\u4E8C\u7EA7\u6807\u9898\u5C42\u7EA7";
export declare function detectHeadingHierarchy(ctx: ParsedDocumentContext): RuleDetection[];
export declare const headingHierarchyDetector: FormatRuleDetector;
