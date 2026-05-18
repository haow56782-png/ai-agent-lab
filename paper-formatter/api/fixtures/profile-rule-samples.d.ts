import type { CafaRuleSeed } from "./cafa-types.js";
export interface ProfileRuleSample {
    schoolId: string;
    name: string;
    version: string;
    effectiveFrom: string;
    faculty?: string;
    school: "CAFA";
    ruleVersion: string;
    fixtureVersion: string;
    baselineStandard: string;
    rulesJson: any[];
    styleMap: any[];
    rules: CafaRuleSeed["rules"];
}
export declare const CAFA_RULE_SEED: CafaRuleSeed;
export declare const CAFA_PROFILE_RULE_SAMPLE: ProfileRuleSample;
export declare const PROFILE_RULE_SAMPLES: ProfileRuleSample[];
export declare function getProfileRuleSample(schoolId: string): ProfileRuleSample | null;
export declare function getCafaRuleIds(): string[];
