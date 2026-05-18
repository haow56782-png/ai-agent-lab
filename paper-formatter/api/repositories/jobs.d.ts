import type { JobPatch, JobType, StoredJobRecord } from "../../../../packages/shared-types/src/job-contract";
export type JobRecord = StoredJobRecord;
export declare function createJob(record: {
    jobId: string;
    jobType: JobType;
    docId: string;
    profileId?: string;
    estimatedSec?: number;
}): Promise<JobRecord>;
export declare function getJob(jobId: string): Promise<JobRecord | null>;
export declare function updateJob(jobId: string, patch: JobPatch): Promise<JobRecord | null>;
export declare function listJobsByDoc(docId: string): Promise<JobRecord[]>;
