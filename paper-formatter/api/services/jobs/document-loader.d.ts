import * as documentRepo from "../../repositories/documents.js";
export interface UploadedDocumentBuffer {
    documentBuffer: Buffer;
    storagePath: string;
}
export declare function resolveDocument(legacyDocId?: string, sourceJobId?: string): Promise<documentRepo.DocumentRecord>;
export declare function loadUploadedDocumentBuffer(documentRecord: documentRepo.DocumentRecord): Promise<UploadedDocumentBuffer>;
