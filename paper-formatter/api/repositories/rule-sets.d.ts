import type { FindingContract } from "../../../../packages/shared-types/src/finding-contract";
export interface RuleSetSyncInput {
    schoolId: string;
    schoolName: string;
    version: string;
    effectiveFrom: string;
    effectiveTo?: string | null;
    sourceType?: string;
    sourceHash?: string | null;
    rulesJson: Record<string, any>[];
    styleMap: Record<string, any>[];
}
export interface SchoolRuleRow {
    schoolId: string;
    ruleId: string;
    ruleName: string;
    ruleSource: string;
    ruleLevel: string;
    ruleType: string;
    cacheKind: "rule" | "style";
    category: string;
    categoryCode: string;
    thesisSubset: string;
    targetObject: string;
    uiSection: string;
    conditionJson: Record<string, unknown>;
    expectedFormatJson: Record<string, unknown>;
    priority: number;
    conflictPolicy: string;
    warningCode: string;
    fixable: boolean;
    autoFixStrategy: string;
    evidenceJson: Record<string, unknown>;
    rawRuleJson: Record<string, any>;
}
export interface RuleSnapshotInput {
    documentId?: string | null;
    jobId?: string | null;
    findingId?: string | null;
    schoolId: string;
    ruleSetId: string;
    ruleId: string;
    rulePayload: Record<string, unknown>;
    snapshotContext?: "analyze" | "fix" | "download" | "manual_review";
}
export declare function buildSchoolRuleRows(input: RuleSetSyncInput): SchoolRuleRow[];
export declare function upsertRuleSetFromProfile(input: RuleSetSyncInput): Promise<{
    ruleSetId: string;
    ruleCount: number;
}>;
export declare function createRuleSnapshot(input: RuleSnapshotInput): Promise<string>;
export declare function getLatestRuleSetForSchool(schoolId: string): Promise<{
    ruleSetId: string;
    schoolId: string;
    version: string;
} | null>;
export declare function getProfileRulePayloadFromRuleTable(schoolId: string): Promise<{
    ruleSetId: string;
    rulesJson: Record<string, any>[];
    styleMap: Record<string, any>[];
} | null>;
export declare function listRulesForSnapshot(params: {
    schoolId: string;
    ruleIds: string[];
}): Promise<Array<{
    ruleSetId: string;
    ruleId: string;
    payload: Record<string, unknown>;
}>>;
export declare function createAnalyzeRuleSnapshotsForFindings(input: {
    schoolId: string;
    documentId: string;
    jobId: string;
    findings: FindingContract[];
}): Promise<string[]>;
