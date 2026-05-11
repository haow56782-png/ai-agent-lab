import { query } from "../db.js";

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

export async function createDocument(record: {
  docId: string;
  canonicalDocumentId: string;
  filename: string;
  size_bytes: number;
  sha256: string;
  file_type: string;
}): Promise<DocumentRecord> {
  const result = await query<DocumentRecord>(
    `INSERT INTO documents (doc_id, canonical_document_id, filename, size_bytes, sha256, file_type)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [record.docId, record.canonicalDocumentId, record.filename, record.size_bytes, record.sha256, record.file_type],
  );
  return result.rows[0];
}

export async function getDocument(docId: string): Promise<DocumentRecord | null> {
  const result = await query<DocumentRecord>(
    "SELECT * FROM documents WHERE doc_id = $1 OR canonical_document_id = $1",
    [docId],
  );
  return result.rows[0] || null;
}

export async function updateDocument(
  docId: string,
  patch: Partial<Pick<DocumentRecord, "page_count" | "is_scanned_pdf">>,
): Promise<DocumentRecord | null> {
  const sets: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (patch.page_count !== undefined) {
    sets.push(`page_count = $${idx++}`);
    values.push(patch.page_count);
  }
  if (patch.is_scanned_pdf !== undefined) {
    sets.push(`is_scanned_pdf = $${idx++}`);
    values.push(patch.is_scanned_pdf);
  }

  if (sets.length === 0) return getDocument(docId);

  values.push(docId);
  const result = await query<DocumentRecord>(
    `UPDATE documents SET ${sets.join(", ")} WHERE doc_id = $${idx} RETURNING *`,
    values,
  );
  return result.rows[0] || null;
}
