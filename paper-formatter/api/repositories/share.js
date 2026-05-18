import { query } from "../db.js";
export async function createShareReport(record) {
    const result = await query(`INSERT INTO share_reports (share_id, file_id, check_result_id, source_job_id, doc_id, profile_id, payload_json)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`, [
        record.shareId,
        record.fileId,
        record.checkResultId,
        record.sourceJobId ?? null,
        record.docId ?? null,
        record.profileId ?? null,
        JSON.stringify(record.payloadJson),
    ]);
    return result.rows[0];
}
export async function getShareReport(shareId) {
    const result = await query("SELECT * FROM share_reports WHERE share_id = $1", [shareId]);
    return result.rows[0] || null;
}
export async function countShareStats() {
    const result = await query(`SELECT
       (SELECT COUNT(*) FROM documents) AS total_users,
       (SELECT COUNT(DISTINCT school_id) FROM school_profiles) AS total_schools`);
    const row = result.rows[0];
    return {
        totalUsers: Number(row?.total_users || 0),
        totalSchools: Number(row?.total_schools || 0),
    };
}
