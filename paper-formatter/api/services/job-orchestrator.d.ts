import type { AnalyzeJobCommand, FixJobCommand, FixType, FormatJobCommand, QueuedJobResponse } from "../../../../packages/shared-types/src/job-contract";
export declare const FIX_FREE_LIMIT: number;
export declare const SUPPORTED_FIX_TYPES: readonly FixType[];
export declare function startAnalyzeJob(input: AnalyzeJobCommand): Promise<QueuedJobResponse>;
export declare function startFormatJob(input: FormatJobCommand): Promise<QueuedJobResponse>;
export declare function startFixJob(input: FixJobCommand): Promise<QueuedJobResponse>;
