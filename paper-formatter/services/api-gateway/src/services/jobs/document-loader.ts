import { createError, ERROR_CODES } from "../../middleware/error-handler.js";
import * as documentRepo from "../../repositories/documents.js";
import * as jobRepo from "../../repositories/jobs.js";
import * as storage from "../../storage.js";

export interface UploadedDocumentBuffer {
  documentBuffer: Buffer;
  storagePath: string;
}

export async function resolveDocument(legacyDocId?: string, sourceJobId?: string): Promise<documentRepo.DocumentRecord> {
  const requestedLegacyDocId = legacyDocId && legacyDocId.startsWith("job_") ? undefined : legacyDocId;
  const requestedJobId = sourceJobId || (legacyDocId?.startsWith("job_") ? legacyDocId : undefined);
  if (!requestedLegacyDocId && !requestedJobId) {
    throw createError(400, ERROR_CODES.VALIDATION_ERROR, "docId or jobId is required");
  }

  let resolvedLegacyDocId = requestedLegacyDocId;
  if (!resolvedLegacyDocId && requestedJobId) {
    const sourceJob = await jobRepo.getJob(requestedJobId);
    if (!sourceJob) throw createError(404, ERROR_CODES.NOT_FOUND, `Job ${requestedJobId} not found`);
    resolvedLegacyDocId = sourceJob.doc_id;
  }
  if (!resolvedLegacyDocId) {
    throw createError(400, ERROR_CODES.VALIDATION_ERROR, "Unable to resolve document");
  }

  const documentRecord = await documentRepo.getDocument(resolvedLegacyDocId);
  if (!documentRecord) throw createError(404, ERROR_CODES.NOT_FOUND, `Document ${resolvedLegacyDocId} not found`);
  return documentRecord;
}

export async function loadUploadedDocumentBuffer(documentRecord: documentRepo.DocumentRecord): Promise<UploadedDocumentBuffer> {
  const storagePath = storage.getStoragePath("uploads", documentRecord.doc_id, documentRecord.filename);
  try {
    return {
      storagePath,
      documentBuffer: await storage.downloadFile("uploads", storagePath),
    };
  } catch {
    throw new Error(`Document ${documentRecord.doc_id} not found in storage`);
  }
}
