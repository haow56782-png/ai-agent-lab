import type { FixType } from "../../../../packages/shared-types/src/job-contract";
export declare const RULE_ID_TO_FIX_TYPES: Record<string, FixType[]>;
export declare function ruleMatchesFixType(ruleId: string | undefined, fixType: FixType): boolean;
