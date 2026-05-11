import { query } from "../db.js";
import type { JobPatch, JobType, StoredJobRecord } from "../../../../packages/shared-types/src/job-contract";

export type JobRecord = StoredJobRecord;

export async function createJob(record: {
  jobId: string;
  jobType: JobType;
  docId: string;
  profileId?: string;
  estimatedSec?: number;
}): Promise<JobRecord> {
  const result = await query<JobRecord>(
    `INSERT INTO jobs (job_id, job_type, doc_id, profile_id, estimated_sec)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [record.jobId, record.jobType, record.docId, record.profileId ?? null, record.estimatedSec ?? null],
  );
  return result.rows[0];
}

export async function getJob(jobId: string): Promise<JobRecord | null> {
  const result = await query<JobRecord>(
    "SELECT * FROM jobs WHERE job_id = $1",
    [jobId],
  );
  return result.rows[0] || null;
}

export async function updateJob(
  jobId: string,
  patch: JobPatch,
): Promise<JobRecord | null> {
  const sets: string[] = [];
  const values: any[] = [];
  let idx = 1;

  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) {
      sets.push(`${key} = $${idx++}`);
      values.push(value);
    }
  }

  if (sets.length === 0) return getJob(jobId);

  values.push(jobId);
  const result = await query<JobRecord>(
    `UPDATE jobs SET ${sets.join(", ")} WHERE job_id = $${idx} RETURNING *`,
    values,
  );
  return result.rows[0] || null;
}

export async function listJobsByDoc(docId: string): Promise<JobRecord[]> {
  const result = await query<JobRecord>(
    "SELECT * FROM jobs WHERE doc_id = $1 ORDER BY created_at DESC",
    [docId],
  );
  return result.rows;
}
