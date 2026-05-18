import { query } from "../db.js";
export async function createDocument(record) {
    const result = await query(`INSERT INTO documents (doc_id, canonical_document_id, filename, size_bytes, sha256, file_type)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`, [record.docId, record.canonicalDocumentId, record.filename, record.size_bytes, record.sha256, record.file_type]);
    return result.rows[0];
}
export async function getDocument(docId) {
    const result = await query("SELECT * FROM documents WHERE doc_id = $1 OR canonical_document_id = $1", [docId]);
    return result.rows[0] || null;
}
export async function updateDocument(docId, patch) {
    const sets = [];
    const values = [];
    let idx = 1;
    if (patch.page_count !== undefined) {
        sets.push(`page_count = $${idx++}`);
        values.push(patch.page_count);
    }
    if (patch.is_scanned_pdf !== undefined) {
        sets.push(`is_scanned_pdf = $${idx++}`);
        values.push(patch.is_scanned_pdf);
    }
    if (sets.length === 0)
        return getDocument(docId);
    values.push(docId);
    const result = await query(`UPDATE documents SET ${sets.join(", ")} WHERE doc_id = $${idx} RETURNING *`, values);
    return result.rows[0] || null;
}
