import { v4 as uuid } from "uuid";
import { createError, ERROR_CODES } from "../middleware/error-handler.js";
import * as docRepo from "../repositories/documents.js";
import * as jobRepo from "../repositories/jobs.js";
import { resolveDocument } from "./jobs/document-loader.js";
import { processAnalyzeJob } from "./jobs/analyze-job-runner.js";
import { processFixJob } from "./jobs/fix-job-runner.js";
import { processFormatJob } from "./jobs/format-job-runner.js";
import type {
  AnalyzeJobCommand,
  FixJobCommand,
  FixType,
  FormatJobCommand,
  QueuedJobResponse,
} from "../../../../packages/shared-types/src/job-contract";

const ESTIMATED_SECONDS: Record<string, number> = {
  analyze: 15,
  format: 25,
  fix: 20,
};

export const FIX_FREE_LIMIT = Math.max(0, parseInt(process.env.FIX_FREE_LIMIT || "15", 10) || 15);

export const SUPPORTED_FIX_TYPES: readonly FixType[] = [
  "margin",
  "body_style",
  "heading",
  "page_number",
  "cover",
  "toc",
  "duplication_preprocess",
  "header_footer",
  "abstract_format",
  "cross_ref",
  "caption",
  "reference_format",
  "table_format",
  "image_format",
  "punctuation",
] as const;

export async function startAnalyzeJob(input: AnalyzeJobCommand): Promise<QueuedJobResponse> {
  if (!input.legacyDocId) throw createError(400, ERROR_CODES.VALIDATION_ERROR, "docId is required");

  const doc = await docRepo.getDocument(input.legacyDocId);
  if (!doc) throw createError(404, ERROR_CODES.NOT_FOUND, `Document ${input.legacyDocId} not found`);

  const jobId = `job_${uuid().slice(0, 8)}`;
  await jobRepo.createJob({
    jobId,
    jobType: "analyze",
    docId: input.legacyDocId,
    profileId: input.profileId || undefined,
    estimatedSec: ESTIMATED_SECONDS.analyze,
  });

  void processAnalyzeJob(jobId, doc, input.profileId);
  return { jobId, status: "queued", estimatedSeconds: ESTIMATED_SECONDS.analyze };
}

export async function startFormatJob(input: FormatJobCommand): Promise<QueuedJobResponse> {
  const doc = await resolveDocument(input.legacyDocId, input.jobId);
  const jobId = `job_${uuid().slice(0, 8)}`;

  await jobRepo.createJob({
    jobId,
    jobType: "format",
    docId: doc.doc_id,
    profileId: input.profileId || undefined,
    estimatedSec: input.profileId ? ESTIMATED_SECONDS.format : 5,
  });

  void processFormatJob(jobId, doc, input.profileId);
  return { jobId, status: "queued", estimatedSeconds: input.profileId ? ESTIMATED_SECONDS.format : 5 };
}

export async function startFixJob(input: FixJobCommand): Promise<QueuedJobResponse> {
  if (!input.profileId) throw createError(400, ERROR_CODES.VALIDATION_ERROR, "profileId is required");

  const doc = await resolveDocument(input.legacyDocId, input.jobId);
  const requestedFixTypes = Array.isArray(input.selectedFixes) && input.selectedFixes.length > 0
    ? input.selectedFixes
    : Array.isArray(input.fixTypes) && input.fixTypes.length > 0
    ? input.fixTypes
    : [...SUPPORTED_FIX_TYPES];
  const invalidFixTypes = requestedFixTypes.filter((type) => !SUPPORTED_FIX_TYPES.includes(type as FixType));
  if (invalidFixTypes.length > 0) {
    throw createError(400, ERROR_CODES.VALIDATION_ERROR, `Unsupported fixTypes: ${invalidFixTypes.join(", ")}`);
  }

  const jobId = `job_${uuid().slice(0, 8)}`;
  const estimatedSeconds = Math.max(requestedFixTypes.length * 2, ESTIMATED_SECONDS.fix);

  await jobRepo.createJob({
    jobId,
    jobType: "fix",
    docId: doc.doc_id,
    profileId: input.profileId,
    estimatedSec: estimatedSeconds,
  });

  await jobRepo.updateJob(jobId, {
    result_json: {
      sourceJobId: input.jobId || null,
      fixTypes: requestedFixTypes,
      selectedFixes: requestedFixTypes,
      completedSteps: [],
      message: "修复任务已创建，等待执行",
    },
  });

  void processFixJob(jobId, doc, input.profileId, requestedFixTypes as FixType[], input.jobId);
  return { jobId, status: "queued", estimatedSeconds, freeFixLimit: FIX_FREE_LIMIT };
}
