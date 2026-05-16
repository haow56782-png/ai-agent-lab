import { beforeEach, describe, expect, it, vi } from "vitest";
import { documentRoutes } from "../src/routes/documents.js";
import { errorHandler } from "../src/middleware/error-handler.js";
import * as docRepo from "../src/repositories/documents.js";

vi.mock("../src/repositories/documents.js", () => ({
  createDocument: vi.fn(),
  getDocument: vi.fn(),
  updateDocument: vi.fn(),
}));

vi.mock("../src/storage.js", () => ({
  getStoragePath: vi.fn((bucket: string, docId: string, filename: string) => `${bucket}/${docId}/${filename}`),
  uploadFile: vi.fn(),
  downloadFile: vi.fn(),
}));

describe("document routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function request(path: string, init?: { method?: string }) {
    return new Promise<{ response: { status: number }; body: any }>((resolve, reject) => {
      const strippedPath = path.replace(/^\/documents(?=\/|\?|$)/, "") || "/";
      const req: any = {
        method: init?.method ?? "GET",
        url: strippedPath,
        originalUrl: path,
        headers: { "content-type": "application/json" },
        body: undefined,
        query: Object.fromEntries(new URL(`http://local.test${path}`).searchParams.entries()),
      };
      const res: any = {
        statusCode: 200,
        status(code: number) {
          this.statusCode = code;
          return this;
        },
        json(payload: unknown) {
          resolve({ response: { status: this.statusCode }, body: payload });
          return this;
        },
        send(payload: unknown) {
          resolve({ response: { status: this.statusCode }, body: payload });
          return this;
        },
        setHeader: vi.fn(),
      };
      documentRoutes.handle(req, res, (err: unknown) => {
        if (!err) {
          resolve({ response: { status: 404 }, body: { error: { message: "Not found" } } });
          return;
        }
        errorHandler(err as Error, req, res, reject);
      });
    });
  }

  it("returns legacy docId plus canonicalDocumentId for document lookups", async () => {
    vi.mocked(docRepo.getDocument).mockResolvedValue({
      doc_id: "doc_abcd1234",
      canonical_document_id: "11111111-1111-4111-8111-111111111111",
      filename: "paper.docx",
      size_bytes: 2048,
      sha256: "a".repeat(64),
      file_type: "docx",
      page_count: 12,
      is_scanned_pdf: false,
      created_at: "2026-05-11T00:00:00.000Z",
    });

    const { response, body } = await request("/documents/doc_abcd1234");

    expect(response.status).toBe(200);
    expect(docRepo.getDocument).toHaveBeenCalledWith("doc_abcd1234");
    expect(body).toMatchObject({
      docId: "doc_abcd1234",
      canonicalDocumentId: "11111111-1111-4111-8111-111111111111",
      filename: "paper.docx",
      pageCount: 12,
    });
  });

  it("normalizes mojibake filenames before returning document payloads", async () => {
    vi.mocked(docRepo.getDocument).mockResolvedValue({
      doc_id: "doc_mojibake",
      canonical_document_id: "22222222-2222-4222-8222-222222222222",
      filename: "å°å·å¤§å­¦æ¬ç§çè®ºæ.docx",
      size_bytes: 4096,
      sha256: "b".repeat(64),
      file_type: "docx",
      page_count: 9,
      is_scanned_pdf: false,
      created_at: "2026-05-13T00:00:00.000Z",
    });

    const { response, body } = await request("/documents/doc_mojibake");

    expect(response.status).toBe(200);
    expect(body.filename).toBe("兰州大学本科生论文.docx");
  });
});
