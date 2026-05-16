import * as documentRepo from "../../repositories/documents.js";
import * as storage from "../../storage.js";

export interface FixOutputWriteResult {
  outputKey: string;
  diffKey: string;
  isPassthrough: boolean;
}

function resolveFixedDocumentSuffix(isPdfPassthrough: boolean): string {
  return isPdfPassthrough ? "_fixed.pdf" : "_fixed.docx";
}

function resolveFixedDocumentContentType(isPdfPassthrough: boolean): string {
  return isPdfPassthrough
    ? "application/pdf"
    : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
}

export async function writeFixOutputs(writeRequest: {
  jobId: string;
  documentRecord: documentRepo.DocumentRecord;
  originalDocumentBuffer: Buffer;
  fixedDocumentBuffer: Buffer;
  diffJson: unknown;
}): Promise<FixOutputWriteResult> {
  const isPassthrough = writeRequest.fixedDocumentBuffer === writeRequest.originalDocumentBuffer;
  const isPdfPassthrough = isPassthrough && /\.pdf$/i.test(writeRequest.documentRecord.filename);
  const outputSuffix = resolveFixedDocumentSuffix(isPdfPassthrough);
  const outputContentType = resolveFixedDocumentContentType(isPdfPassthrough);
  const outputFilename = writeRequest.documentRecord.filename.replace(/\.(docx|pdf)$/i, outputSuffix);
  const outputKey = storage.getStoragePath("outputs", writeRequest.documentRecord.doc_id, outputFilename);
  await storage.uploadFile("outputs", outputKey, writeRequest.fixedDocumentBuffer, outputContentType);

  const diffKey = `${writeRequest.documentRecord.doc_id}/fix-${writeRequest.jobId}-diff.json`;
  await storage.uploadFile("reports", diffKey, Buffer.from(JSON.stringify(writeRequest.diffJson, null, 2)), "application/json");

  return { outputKey, diffKey, isPassthrough };
}
