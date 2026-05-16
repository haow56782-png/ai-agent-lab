import { beforeEach, describe, expect, test, vi } from "vitest";
import type { DocumentRecord } from "../src/repositories/documents.js";
import { writeFixOutputs } from "../src/services/jobs/fix-output-writer.js";

const storageMock = vi.hoisted(() => ({
  uploadFile: vi.fn(),
  getStoragePath: vi.fn(),
}));

vi.mock("../src/storage.js", () => ({
  uploadFile: storageMock.uploadFile,
  getStoragePath: storageMock.getStoragePath,
}));

function makeDocumentRecord(filename: string): DocumentRecord {
  return {
    doc_id: "doc_001",
    canonical_document_id: "canonical-doc-001",
    filename,
    size_bytes: 1024,
    sha256: "sha256",
    file_type: filename.endsWith(".pdf") ? "pdf" : "docx",
    page_count: null,
    is_scanned_pdf: false,
    created_at: "2026-05-15T00:00:00.000Z",
  };
}

describe("fix output writer", () => {
  beforeEach(() => {
    storageMock.uploadFile.mockReset();
    storageMock.getStoragePath.mockReset();
    storageMock.getStoragePath.mockImplementation((bucket: string, docId: string, filename: string) => `${bucket}/${docId}/${filename}`);
  });

  test("writes fixed docx and diff report", async () => {
    const originalDocumentBuffer = Buffer.from("original-docx");
    const fixedDocumentBuffer = Buffer.from("fixed-docx");
    const result = await writeFixOutputs({
      jobId: "job_fix_001",
      documentRecord: makeDocumentRecord("thesis.docx"),
      originalDocumentBuffer,
      fixedDocumentBuffer,
      diffJson: { diffs: [{ finding_id: "finding-1" }] },
    });

    expect(result).toEqual({
      outputKey: "outputs/doc_001/thesis_fixed.docx",
      diffKey: "doc_001/fix-job_fix_001-diff.json",
      isPassthrough: false,
    });
    expect(storageMock.uploadFile).toHaveBeenNthCalledWith(
      1,
      "outputs",
      "outputs/doc_001/thesis_fixed.docx",
      fixedDocumentBuffer,
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
    expect(storageMock.uploadFile).toHaveBeenNthCalledWith(
      2,
      "reports",
      "doc_001/fix-job_fix_001-diff.json",
      expect.any(Buffer),
      "application/json",
    );
  });

  test("preserves pdf passthrough output type", async () => {
    const originalDocumentBuffer = Buffer.from("pdf-content");
    const result = await writeFixOutputs({
      jobId: "job_fix_pdf",
      documentRecord: makeDocumentRecord("thesis.pdf"),
      originalDocumentBuffer,
      fixedDocumentBuffer: originalDocumentBuffer,
      diffJson: { diffs: [] },
    });

    expect(result.isPassthrough).toBe(true);
    expect(result.outputKey).toBe("outputs/doc_001/thesis_fixed.pdf");
    expect(storageMock.uploadFile).toHaveBeenNthCalledWith(
      1,
      "outputs",
      "outputs/doc_001/thesis_fixed.pdf",
      originalDocumentBuffer,
      "application/pdf",
    );
  });
});
