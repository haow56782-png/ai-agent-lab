import { beforeEach, describe, expect, it, vi } from "vitest";
import { jobRoutes } from "../src/routes/jobs.js";
import { errorHandler } from "../src/middleware/error-handler.js";
import * as orchestrator from "../src/services/job-orchestrator.js";

// Jobs route tests exercise the HTTP-to-command adapter.
// Public payloads still use legacy docId for client compatibility.
// Services receive explicit legacy document ids after DTO parsing.
// This prevents canonical finding identity from leaking into job commands.

vi.mock("../src/services/job-orchestrator.js", () => ({
  startAnalyzeJob: vi.fn(),
  startFormatJob: vi.fn(),
  startFixJob: vi.fn(),
}));

vi.mock("../src/services/job-queries.js", () => ({
  getPublicDiff: vi.fn(),
  getPublicFixStatus: vi.fn(),
  getPublicJob: vi.fn(),
  writeJobDownload: vi.fn(),
}));

describe("job routes document request DTOs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(orchestrator.startAnalyzeJob).mockResolvedValue({
      jobId: "job_analyze",
      status: "queued",
      estimatedSeconds: 30,
    });
    vi.mocked(orchestrator.startFormatJob).mockResolvedValue({
      jobId: "job_format",
      status: "queued",
      estimatedSeconds: 5,
    });
    vi.mocked(orchestrator.startFixJob).mockResolvedValue({
      jobId: "job_fix",
      status: "queued",
      estimatedSeconds: 180,
    });
  });

  async function request(path: string, body: Record<string, unknown>) {
    return new Promise<{ response: { status: number }; body: any }>((resolve, reject) => {
      const strippedPath = path.replace(/^\/jobs(?=\/|\?|$)/, "") || "/";
      const req: any = {
        method: "POST",
        url: strippedPath,
        originalUrl: path,
        headers: { "content-type": "application/json" },
        body,
        query: {},
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
      };
      jobRoutes.handle(req, res, (err: unknown) => {
        if (!err) {
          resolve({ response: { status: 404 }, body: { error: { message: "Not found" } } });
          return;
        }
        errorHandler(err as Error, req, res, reject);
      });
    });
  }

  it("adapts analyze requests into a legacy document command", async () => {
    const result = await request("/jobs/analyze", {
      docId: " doc_abc123 ",
      profileId: " USTC-vAuto ",
    });

    expect(result.response.status).toBe(202);
    expect(result.body.jobId).toBe("job_analyze");
    expect(orchestrator.startAnalyzeJob).toHaveBeenCalledWith({
      legacyDocId: "doc_abc123",
      profileId: "USTC-vAuto",
    });
  });

  it("adapts format requests without introducing canonical document ids", async () => {
    const result = await request("/jobs/format", {
      docId: "doc_abc123",
      jobId: "job_source",
      profileId: "USTC-vAuto",
    });

    expect(result.response.status).toBe(202);
    expect(orchestrator.startFormatJob).toHaveBeenCalledWith({
      legacyDocId: "doc_abc123",
      jobId: "job_source",
      profileId: "USTC-vAuto",
    });
  });

  it("adapts fix requests with selected fixes through the legacy command boundary", async () => {
    const result = await request("/jobs/fix", {
      docId: "doc_abc123",
      jobId: "job_source",
      profileId: "USTC-vAuto",
      selectedFixes: ["margin", "heading"],
    });

    expect(result.response.status).toBe(202);
    expect(orchestrator.startFixJob).toHaveBeenCalledWith({
      legacyDocId: "doc_abc123",
      jobId: "job_source",
      profileId: "USTC-vAuto",
      fixTypes: undefined,
      selectedFixes: ["margin", "heading"],
    });
  });
});
