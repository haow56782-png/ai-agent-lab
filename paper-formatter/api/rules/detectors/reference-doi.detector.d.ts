import type { FormatRuleDetector, ParsedDocumentContext, RuleDetection } from "../rule-types.js";
export declare const REFERENCE_MISSING_DOI_RULE_ID = "REFERENCE_MISSING_DOI";
export declare const REFERENCE_MISSING_DOI_LABEL = "\u7F3A DOI";
export declare function detectReferenceMissingDoi(ctx: ParsedDocumentContext): RuleDetection[];
export declare const referenceMissingDoiDetector: FormatRuleDetector;
