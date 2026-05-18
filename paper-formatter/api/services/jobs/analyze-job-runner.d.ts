import * as documentRepo from "../../repositories/documents.js";
export declare function processAnalyzeJob(jobId: string, documentRecord: documentRepo.DocumentRecord, profileId?: string): Promise<void>;
