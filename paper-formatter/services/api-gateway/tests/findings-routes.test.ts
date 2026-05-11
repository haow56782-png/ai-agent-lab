import { beforeEach, describe, expect, it, vi } from "vitest";
import { findingRoutes } from "../src/routes/findings.js";
import { errorHandler } from "../src/middleware/error-handler.js";
import * as findingRepo from "../src/repositories/findings.js";
import type { FindingContract } from "../../../packages/shared-types/src/finding-contract";

vi.mock("../src/repositories/findings.js", () => ({
  listFindings: vi.fn(),
  upsertFindings: vi.fn(),
  setFindingStatus: vi.fn(),
  recordP1Exemption: vi.fn(),
}));

function sampleFinding(overrides: Partial<FindingContract> = {}): FindingContract {
  const now = new Date("2026-05-11T00:00:00.000Z").toISOString();
  return {
    finding_id: "11111111-1111-4111-8111-111111111111",
    document_id: "22222222-2222-4222-8222-222222222222",
    document_version: 1,
    rule_id: "RULE-L2-CITATION_CONSISTENCY",
    rule_group: "citation_consistency",
    rule_snapshot: {
      rule_text: "参考文献著录需完整",
      rule_version: "GB/T 7713.1-2025",
    },
    severity: "P1",
    confidence: 0.86,
    evidence_spans: [{
      page: 3,
      char_start: 0,
      char_end: 6,
      snippet: "缺 DOI",
    }],
    evidence_snapshot: "缺 DOI",
    suggestion: {
      type: "replace",
      explanation: "补齐 DOI，便于学校和数据库准确识别",
      fix_diff: {
        before: "缺 DOI",
        after: "补齐 DOI",
        spans_affected: [{
          page: 3,
          char_start: 0,
          char_end: 6,
          snippet: "缺 DOI",
        }],
      },
    },
    status: "pending",
    created_at: now,
    updated_at: now,
    audit_trail: [],
    ...overrides,
  };
}

describe("finding routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function request(path: string, init?: { method?: string; body?: string }) {
    return new Promise<{ response: { status: number }; body: any }>((resolve, reject) => {
      const strippedPath = path.replace(/^\/findings(?=\/|\?|$)/, "") || "/";
      const routerPath = strippedPath.startsWith("?") ? `/${strippedPath}` : strippedPath;
      const req: any = {
        method: init?.method ?? "GET",
        url: routerPath,
        originalUrl: path,
        headers: { "content-type": "application/json" },
        body: init?.body ? JSON.parse(init.body) : undefined,
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
      };
      findingRoutes.handle(req, res, (err: unknown) => {
        if (!err) {
          resolve({ response: { status: 404 }, body: { error: { message: "Not found" } } });
          return;
        }
        errorHandler(err as Error, req, res, reject);
      });
    });
  }

  it("rejects page-centric finding queries", async () => {
    const { response, body } = await request("/findings?page=3");

    expect(response.status).toBe(400);
    expect(body.error.message).toContain("must not use page");
    expect(findingRepo.listFindings).not.toHaveBeenCalled();
  });

  it("lists findings by canonical document_id and job_id without page state", async () => {
    const finding = sampleFinding();
    vi.mocked(findingRepo.listFindings).mockResolvedValue([finding]);

    const { response, body } = await request(`/findings?document_id=${finding.document_id}&job_id=job_123`);

    expect(response.status).toBe(200);
    expect(body).toEqual([finding]);
    expect(findingRepo.listFindings).toHaveBeenCalledWith({
      document_id: finding.document_id,
      job_id: "job_123",
      status: undefined,
      severity: undefined,
      rule_id: undefined,
      rule_group: undefined,
    });
  });

  it("syncs contract findings through document_id and job_id", async () => {
    const finding = sampleFinding();
    vi.mocked(findingRepo.upsertFindings).mockResolvedValue([finding]);

    const { response, body } = await request("/findings/sync", {
      method: "POST",
      body: JSON.stringify({
        job_id: "job_123",
        document_id: finding.document_id,
        findings: [finding],
      }),
    });

    expect(response.status).toBe(200);
    expect(body).toEqual({ upserted_count: 1, finding_ids: [finding.finding_id] });
    expect(findingRepo.upsertFindings).toHaveBeenCalledWith({
      jobId: "job_123",
      documentId: finding.document_id,
      findings: [finding],
    });
  });

  it("accepts and rejects findings through the status machine edge", async () => {
    const accepted = sampleFinding({ status: "accepted" });
    vi.mocked(findingRepo.setFindingStatus).mockResolvedValueOnce(accepted);

    const acceptResult = await request(`/findings/${accepted.finding_id}/accept`, {
      method: "POST",
      body: JSON.stringify({ actor_id: "author-1", actor_role: "Author" }),
    });

    expect(acceptResult.response.status).toBe(200);
    expect(acceptResult.body.status).toBe("accepted");
    expect(findingRepo.setFindingStatus).toHaveBeenCalledWith({
      findingId: accepted.finding_id,
      status: "accepted",
      actorId: "author-1",
      actorRole: "Author",
      action: "accept",
    });

    const rejected = sampleFinding({ status: "rejected" });
    vi.mocked(findingRepo.setFindingStatus).mockResolvedValueOnce(rejected);
    const rejectResult = await request(`/findings/${rejected.finding_id}/reject`, {
      method: "POST",
      body: JSON.stringify({ actor_id: "author-1", actor_role: "Author", reason: "作者确认不采纳" }),
    });

    expect(rejectResult.response.status).toBe(200);
    expect(rejectResult.body.status).toBe("rejected");
    expect(findingRepo.setFindingStatus).toHaveBeenLastCalledWith({
      findingId: rejected.finding_id,
      status: "rejected",
      actorId: "author-1",
      actorRole: "Author",
      action: "reject",
      reason: "作者确认不采纳",
    });
  });

  it("requires acknowledged P1 exemption reason and records audit ids", async () => {
    const finding = sampleFinding();
    const invalid = await request("/findings/exempt-p1", {
      method: "POST",
      body: JSON.stringify({
        document_id: finding.document_id,
        actor_id: "author-1",
        actor_role: "Author",
        exempted_finding_ids: [finding.finding_id],
        reason: "太短",
        acknowledged: true,
      }),
    });

    expect(invalid.response.status).toBe(400);
    expect(findingRepo.recordP1Exemption).not.toHaveBeenCalled();

    vi.mocked(findingRepo.recordP1Exemption).mockResolvedValue({
      record: {
        exempted_finding_ids: [finding.finding_id],
        actor_id: "author-1",
        actor_role: "Author",
        reason: "作者确认该 P1 风险不影响本次交稿，先行下载并承担风险。",
        acknowledged: true,
        timestamp: "2026-05-11T00:00:00.000Z",
      },
      audits: [{
        audit_id: "audit-1",
        target_type: "exemption",
        target_id: finding.finding_id,
        actor_id: "author-1",
        actor_role: "Author",
        action: "exempt",
        timestamp: "2026-05-11T00:00:00.000Z",
      }],
    });

    const valid = await request("/findings/exempt-p1", {
      method: "POST",
      body: JSON.stringify({
        document_id: finding.document_id,
        actor_id: "author-1",
        actor_role: "Author",
        exempted_finding_ids: [finding.finding_id],
        reason: "作者确认该 P1 风险不影响本次交稿，先行下载并承担风险。",
        acknowledged: true,
      }),
    });

    expect(valid.response.status).toBe(200);
    expect(valid.body.audit_ids).toEqual(["audit-1"]);
    expect(findingRepo.recordP1Exemption).toHaveBeenCalledWith({
      documentId: finding.document_id,
      findingIds: [finding.finding_id],
      actorId: "author-1",
      actorRole: "Author",
      reason: "作者确认该 P1 风险不影响本次交稿，先行下载并承担风险。",
    });
  });
});
