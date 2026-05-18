import type { ParsedDocumentContext, RuleDetection } from "./rule-types.js";
export declare const FORMAT_RULE_DETECTORS: {
    ruleId: string;
    label: string;
    group: string;
    severity: string;
    detect(ctx: ParsedDocumentContext): RuleDetection[];
}[];
export declare function runFormatRuleDetectors(ctx: ParsedDocumentContext): RuleDetection[];
