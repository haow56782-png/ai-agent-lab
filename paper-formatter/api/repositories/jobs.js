import { query } from "../db.js";
export async function createJob(record) {
    const result = await query(`INSERT INTO jobs (job_id, job_type, doc_id, profile_id, estimated_sec)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`, [record.jobId, record.jobType, record.docId, record.profileId ?? null, record.estimatedSec ?? null]);
    return result.rows[0];
}
export async function getJob(jobId) {
    const result = await query("SELECT * FROM jobs WHERE job_id = $1", [jobId]);
    return result.rows[0] || null;
}
export async function updateJob(jobId, patch) {
    const sets = [];
    const values = [];
    let idx = 1;
    for (const [key, value] of Object.entries(patch)) {
        if (value !== undefined) {
            sets.push(`${key} = $${idx++}`);
            values.push(value);
        }
    }
    if (sets.length === 0)
        return getJob(jobId);
    values.push(jobId);
    const result = await query(`UPDATE jobs SET ${sets.join(", ")} WHERE job_id = $${idx} RETURNING *`, values);
    return result.rows[0] || null;
}
export async function listJobsByDoc(docId) {
    const result = await query("SELECT * FROM jobs WHERE doc_id = $1 ORDER BY created_at DESC", [docId]);
    return result.rows;
}
