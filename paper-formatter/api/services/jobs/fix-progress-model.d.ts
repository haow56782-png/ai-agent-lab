import type { FixJobArtifact, FixStepResult, FixType } from "../../../../../packages/shared-types/src/job-contract";
export type CompletedFixStep = FixStepResult & {
    status: "done";
};
export interface FixProgressMeta {
    findingTotal: number;
    autoFixableFindingTotal: number;
    fixedFindingTotal: number;
    needsReviewFindingTotal: number;
    notAutoFixedFindingTotal: number;
    actionTotal: number;
    completedActionTotal: number;
}
export declare function countFixedFindings(progressSnapshot: {
    artifacts: FixJobArtifact[];
    completedSteps: CompletedFixStep[];
    findingTotal: number;
}): number;
export declare function countAutoFixableFindings(progressSnapshot: {
    artifacts: FixJobArtifact[];
    fixTypes: FixType[];
    findingTotal: number;
}): number;
export declare function countNeedsReviewFindings(progressSnapshot: {
    artifacts: FixJobArtifact[];
    findingTotal: number;
}): number;
export declare function buildFixProgressMeta(progressSnapshot: {
    artifacts: FixJobArtifact[];
    completedSteps: CompletedFixStep[];
    findingTotal: number;
    fixTypes: FixType[];
}): FixProgressMeta;
export declare function getFixStepProgress(fixIndex: number, fixTypeTotal: number): number;
