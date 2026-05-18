import * as documentRepo from "../../repositories/documents.js";
export interface FixOutputWriteResult {
    outputKey: string;
    diffKey: string;
    isPassthrough: boolean;
}
export declare function writeFixOutputs(writeRequest: {
    jobId: string;
    documentRecord: documentRepo.DocumentRecord;
    originalDocumentBuffer: Buffer;
    fixedDocumentBuffer: Buffer;
    diffJson: unknown;
}): Promise<FixOutputWriteResult>;
