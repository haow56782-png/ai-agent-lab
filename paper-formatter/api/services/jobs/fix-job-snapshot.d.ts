import type { FixJobArtifact, FixJobEvent, FixResult, FixType } from "../../../../../packages/shared-types/src/job-contract";
import { type CompletedFixStep } from "./fix-progress-model.js";
interface FixJobSnapshotBase {
    fixTypes: FixType[];
    completedSteps: CompletedFixStep[];
    events: FixJobEvent[];
    artifacts: FixJobArtifact[];
    findingTotal: number;
}
interface ProcessingFixJobSnapshotInput extends FixJobSnapshotBase {
    message: string;
    currentStep?: FixType;
}
interface CompletedFixJobSnapshotInput extends FixJobSnapshotBase {
    message: string;
    outputPath: string;
    diffPath: string;
    result: FixResult;
}
interface FailedFixJobSnapshotInput extends FixJobSnapshotBase {
    message: string;
}
export declare function buildProcessingFixJobSnapshot(snapshotInput: ProcessingFixJobSnapshotInput): {
    currentStep: FixType | undefined;
    message: string;
    findingTotal: number;
    autoFixableFindingTotal: number;
    fixedFindingTotal: number;
    needsReviewFindingTotal: number;
    notAutoFixedFindingTotal: number;
    actionTotal: number;
    completedActionTotal: number;
    fixTypes: FixType[];
    selectedFixes: FixType[];
    completedSteps: CompletedFixStep[];
    events: FixJobEvent[];
    artifacts: FixJobArtifact[];
};
export declare function buildCompletedFixJobSnapshot(snapshotInput: CompletedFixJobSnapshotInput): {
    message: string;
    result: FixResult;
    findingTotal: number;
    autoFixableFindingTotal: number;
    fixedFindingTotal: number;
    needsReviewFindingTotal: number;
    notAutoFixedFindingTotal: number;
    actionTotal: number;
    completedActionTotal: number;
    fixTypes: FixType[];
    selectedFixes: FixType[];
    completedSteps: CompletedFixStep[];
    events: FixJobEvent[];
    artifacts: FixJobArtifact[];
    outputPath: string;
    diffPath: string;
};
export declare function buildFailedFixJobSnapshot(snapshotInput: FailedFixJobSnapshotInput): {
    message: string;
    findingTotal: number;
    autoFixableFindingTotal: number;
    fixedFindingTotal: number;
    needsReviewFindingTotal: number;
    notAutoFixedFindingTotal: number;
    actionTotal: number;
    completedActionTotal: number;
    fixTypes: FixType[];
    selectedFixes: FixType[];
    completedSteps: CompletedFixStep[];
    events: FixJobEvent[];
    artifacts: FixJobArtifact[];
};
export {};
