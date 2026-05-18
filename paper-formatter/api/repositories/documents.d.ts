export interface DocumentRecord {
    doc_id: string;
    canonical_document_id: string;
    filename: string;
    size_bytes: number;
    sha256: string;
    file_type: string;
    page_count: number | null;
    is_scanned_pdf: boolean;
    created_at: string;
}
export declare function createDocument(record: {
    docId: string;
    canonicalDocumentId: string;
    filename: string;
    size_bytes: number;
    sha256: string;
    file_type: string;
}): Promise<DocumentRecord>;
export declare function getDocument(docId: string): Promise<DocumentRecord | null>;
export declare function updateDocument(docId: string, patch: Partial<Pick<DocumentRecord, "page_count" | "is_scanned_pdf">>): Promise<DocumentRecord | null>;
