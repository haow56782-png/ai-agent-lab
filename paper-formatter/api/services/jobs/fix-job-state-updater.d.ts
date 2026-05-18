interface FixJobProcessingUpdate {
    progress: number;
    stage: string;
    resultJson: Record<string, unknown>;
    startedAt?: string;
}
interface FixJobCompletedUpdate {
    resultJson: Record<string, unknown>;
    completedAt: string;
}
interface FixJobFailedUpdate {
    resultJson: Record<string, unknown>;
    errorMessage: string;
}
export declare function createFixJobStateUpdater(jobId: string): {
    markProcessing(processingUpdate: FixJobProcessingUpdate): Promise<void | import("../../../../../packages/shared-types/src/job-contract").StoredJobRecord | null>;
    markCompleted(completedUpdate: FixJobCompletedUpdate): Promise<void | import("../../../../../packages/shared-types/src/job-contract").StoredJobRecord | null>;
    markFailed(failedUpdate: FixJobFailedUpdate): Promise<void | import("../../../../../packages/shared-types/src/job-contract").StoredJobRecord | null>;
};
export {};
