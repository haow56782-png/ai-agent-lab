import type { Response } from "express";
import type { FindingDiffResult, FixStatusResponse, PublicJobRecord } from "../../../../packages/shared-types/src/job-contract";
export declare function getPublicJob(jobId: string): Promise<PublicJobRecord>;
export declare function getPublicFixStatus(jobId: string): Promise<FixStatusResponse>;
export declare function getPublicDiff(jobId: string): Promise<FindingDiffResult>;
export declare function writeJobDownload(jobId: string, type: string | undefined, res: Response): Promise<void>;
