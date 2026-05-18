import type { CanonicalRuleMapping, ParsedDocumentContext, RuleDetection } from "./rule-types.js";
export declare const DETECTOR_TO_CANONICAL_RULE_ID: Record<string, string>;
export declare const CANONICAL_RULE_ID_EXEMPTIONS: Record<string, string>;
export declare function getCanonicalRuleCoverage(input: {
    detectorRuleIds: string[];
}): {
    covered: string[];
    exempted: Array<{
        ruleId: string;
        reason: string;
    }>;
    missing: string[];
};
export declare function resolveCanonicalRuleId(input: {
    detectorRuleId: string;
    profile: ParsedDocumentContext["profile"];
}): string;
export declare function resolveCanonicalRuleMapping(input: {
    detectorRuleId: string;
    profile: ParsedDocumentContext["profile"];
}): CanonicalRuleMapping;
export declare function canonicalizeRuleDetections(input: {
    detections: RuleDetection[];
    profile: ParsedDocumentContext["profile"];
}): RuleDetection[];
export declare function detectionMatchesRuleId(detection: RuleDetection, ruleId: string): boolean;
