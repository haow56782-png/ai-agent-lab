import type { FixType } from "../../../../../packages/shared-types/src/job-contract";
import * as documentRepo from "../../repositories/documents.js";
export declare function processFixJob(jobId: string, documentRecord: documentRepo.DocumentRecord, profileId: string, fixTypes: FixType[], sourceJobId?: string): Promise<void>;
