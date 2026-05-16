import * as documentRepo from "../../repositories/documents.js";
import * as jobRepo from "../../repositories/jobs.js";
import * as storage from "../../storage.js";
import { loadUploadedDocumentBuffer } from "./document-loader.js";
import { callFormatterService } from "./formatter-client.js";

export async function processFormatJob(jobId: string, documentRecord: documentRepo.DocumentRecord, profileId?: string) {
  const updateFormatJob = (patch: Record<string, any>) =>
    jobRepo.updateJob(jobId, patch).catch((error) =>
      console.error(`[format] Failed to update job ${jobId}:`, error.message)
    );

  try {
    await updateFormatJob({ status: "processing", progress: 10, stage: "validating", started_at: new Date().toISOString() });

    const { documentBuffer } = await loadUploadedDocumentBuffer(documentRecord);

    await updateFormatJob({ progress: 30, stage: "formatting" });

    let formattedBuffer: Buffer;
    let diffJson: any;

    if (!profileId) {
      formattedBuffer = documentBuffer;
      diffJson = {
        diffs: [],
        summary: { pages: 1, changeCount: 0, contentChanges: 0, formatChanges: 0 },
      };
    } else {
      try {
        const formatterResult = await callFormatterService(documentBuffer, documentRecord.filename, profileId);
        formattedBuffer = formatterResult.formatted;
        diffJson = formatterResult.diff;
      } catch (formatterError: any) {
        console.warn("[format] Formatter service failed, using passthrough:", formatterError.message);
        formattedBuffer = documentBuffer;
        diffJson = {
          diffs: [{ page: 1, type: "info", element: "document", original: "original", modified: "original (passthrough)", position: "N/A" }],
          summary: { pages: 1, changeCount: 0, contentChanges: 0, formatChanges: 0 },
        };
      }
    }

    await updateFormatJob({ progress: 70, stage: "uploading" });

    const outputKey = storage.getStoragePath("outputs", documentRecord.doc_id, documentRecord.filename.replace(/\.(docx|pdf)$/, "_formatted.docx"));
    await storage.uploadFile("outputs", outputKey, formattedBuffer);

    const diffKey = `${documentRecord.doc_id}/diff.json`;
    await storage.uploadFile("reports", diffKey, Buffer.from(JSON.stringify(diffJson, null, 2)), "application/json");

    await updateFormatJob({ progress: 90, stage: "validating" });

    const resultJson = {
      outputPath: outputKey,
      diffPath: diffKey,
      diffs: diffJson.diffs?.length || 0,
      summary: diffJson.summary || { pages: 1, changeCount: 0, contentChanges: 0, formatChanges: 0 },
    };

    await updateFormatJob({
      progress: 100,
      stage: "done",
      status: "completed",
      result_json: resultJson,
      completed_at: new Date().toISOString(),
    });

    console.log(`[format] Job ${jobId} completed: ${outputKey}`);
  } catch (error: any) {
    await updateFormatJob({ status: "failed", progress: 0, stage: "error", error_message: error.message });
    console.error(`[format] Job ${jobId} failed:`, error.message);
  }
}
