import { beforeEach, describe, expect, it, vi } from "vitest";
import { jobRoutes } from "../src/routes/jobs.js";
import { errorHandler } from "../src/middleware/error-handler.js";
import * as jobRepo from "../src/repositories/jobs.js";
import * as docRepo from "../src/repositories/documents.js";
import * as findingRepo from "../src/repositories/findings.js";
import * as storage from "../src/storage.js";
import type { FindingContract } from "../../../packages/shared-types/src/finding-contract";

vi.mock("../src/services/job-orchestrator.js", () => ({
  startAnalyzeJob: vi.fn(),
  startFormatJob: vi.fn(),
  startFixJob: vi.fn(),
}));

vi.mock("../src/repositories/jobs.js", () => ({
  getJob: vi.fn(),
}));

vi.mock("../src/repositories/documents.js", () => ({
  getDocument: vi.fn(),
}));

vi.mock("../src/repositories/findings.js", () => ({
  listFindings: vi.fn(),
  listP1ExemptedFindingIds: vi.fn(),
}));

vi.mock("../src/storage.js", () => ({
  downloadFile: vi.fn(),
}));

function sampleFinding(overrides: Partial<FindingContract> = {}): FindingContract {
  const now = "2026-05-11T00:00:00.000Z";
  return {
    finding_id: "finding-p1",
    document_id: "canonical-doc-1",
    document_version: 1,
    rule_id: "RULE-P1",
    rule_group: "format",
    rule_snapshot: {
      rule_text: "P1 finding",
      rule_version: "vAuto",
    },
    severity: "P1",
    confidence: 0.9,
    evidence_spans: [{
      page: 1,
      char_start: 0,
      char_end: 2,
      snippet: "P1",
    }],
    evidence_snapshot: "P1",
    suggestion: {
      type: "replace",
      explanation: "Fix P1",
    },
    status: "pending",
    created_at: now,
    updated_at: now,
    audit_trail: [],
    ...overrides,
  };
}

function completedJob() {
  return {
    job_id: "job_download",
    job_type: "fix",
    doc_id: "legacy-doc-1",
    status: "completed",
    progress: 100,
    stage: "done",
    profile_id: "USTC-vAuto",
    plan_id: null,
    result_json: { outputPath: "legacy-doc-1/fixed.docx" },
    error_code: null,
    error_message: null,
    created_at: "2026-05-11T00:00:00.000Z",
    started_at: "2026-05-11T00:00:00.000Z",
    completed_at: "2026-05-11T00:01:00.000Z",
    estimated_sec: 60,
  };
}

async function requestDownload(path = "/jobs/job_download/download") {
  return new Promise<{ response: { status: number; headers: Record<string, string> }; body: unknown }>((resolve, reject) => {
    const strippedPath = path.replace(/^\/jobs(?=\/|\?|$)/, "") || "/";
    const req: any = {
      method: "GET",
      url: strippedPath,
      originalUrl: path,
      headers: {},
      body: undefined,
      query: Object.fromEntries(new URL(`http://local.test${path}`).searchParams.entries()),
      params: {},
    };
    const headers: Record<string, string> = {};
    const res: any = {
      statusCode: 200,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      setHeader(key: string, value: string) {
        headers[key] = value;
      },
      json(payload: unknown) {
        resolve({ response: { status: this.statusCode, headers }, body: payload });
        return this;
      },
      send(payload: unknown) {
        resolve({ response: { status: this.statusCode, headers }, body: payload });
        return this;
      },
    };
    jobRoutes.handle(req, res, (err: unknown) => {
      if (!err) {
        resolve({ response: { status: 404, headers }, body: { error: { message: "Not found" } } });
        return;
      }
      errorHandler(err as Error, req, res, reject);
    });
  });
}

describe("job download finding guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(jobRepo.getJob).mockResolvedValue(completedJob() as any);
    vi.mocked(docRepo.getDocument).mockResolvedValue({
      doc_id: "legacy-doc-1",
      canonical_document_id: "canonical-doc-1",
      filename: "paper.docx",
      size_bytes: 1024,
      sha256: "hash",
      file_type: "docx",
      page_count: 10,
      is_scanned_pdf: false,
      created_at: "2026-05-11T00:00:00.000Z",
    });
    vi.mocked(findingRepo.listP1ExemptedFindingIds).mockResolvedValue([]);
    vi.mocked(storage.downloadFile).mockResolvedValue(Buffer.from("docx"));
  });

  it("blocks download when canonical document has pending P0 finding", async () => {
    vi.mocked(findingRepo.listFindings).mockResolvedValue([
      sampleFinding({ finding_id: "finding-p0", severity: "P0" }),
    ]);

    const result = await requestDownload();

    expect(result.response.status).toBe(403);
    expect((result.body as any).error.message).toContain("P0");
    expect(storage.downloadFile).not.toHaveBeenCalled();
    expect(findingRepo.listFindings).toHaveBeenCalledWith({ document_id: "canonical-doc-1" });
  });

  it("blocks pending P1 until exemption audit covers that finding", async () => {
    vi.mocked(findingRepo.listFindings).mockResolvedValue([sampleFinding()]);

    const blocked = await requestDownload();

    expect(blocked.response.status).toBe(403);
    expect((blocked.body as any).error.message).toContain("P1");
    expect(storage.downloadFile).not.toHaveBeenCalled();

    vi.mocked(findingRepo.listP1ExemptedFindingIds).mockResolvedValue(["finding-p1"]);
    const allowed = await requestDownload();

    expect(allowed.response.status).toBe(200);
    expect(allowed.body).toEqual(Buffer.from("docx"));
    expect(storage.downloadFile).toHaveBeenCalledWith("outputs", "legacy-doc-1/fixed.docx");
  });

  it("allows download when blocking findings are resolved or rejected", async () => {
    vi.mocked(findingRepo.listFindings).mockResolvedValue([
      sampleFinding({ finding_id: "finding-p0", severity: "P0", status: "resolved" }),
      sampleFinding({ finding_id: "finding-p1", severity: "P1", status: "rejected" }),
    ]);

    const result = await requestDownload();

    expect(result.response.status).toBe(200);
    expect(result.response.headers["Content-Type"]).toBe("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    expect(storage.downloadFile).toHaveBeenCalledWith("outputs", "legacy-doc-1/fixed.docx");
  });
});

