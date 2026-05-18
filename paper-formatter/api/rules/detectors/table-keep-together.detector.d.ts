import type { FormatRuleDetector, ParsedDocumentContext, RuleDetection } from "../rule-types.js";
export declare const TABLE_KEEP_TOGETHER_RULE_ID = "TABLE_KEEP_TOGETHER";
export declare const TABLE_KEEP_TOGETHER_LABEL = "\u8868 keep-together";
export declare function detectTableKeepTogether(ctx: ParsedDocumentContext): RuleDetection[];
export declare const tableKeepTogetherDetector: FormatRuleDetector;
