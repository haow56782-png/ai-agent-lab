import { describe, expect, it } from "vitest";
import {
  parseFindingDocumentQuery,
  parseFindingSyncCommand,
  parseP1ExemptionCommand,
  toFindingListQuery,
} from "../src/dto/finding-document-requests.js";
import type { AppError } from "../src/middleware/error-handler.js";

// Finding DTO tests protect the finding-centric identity boundary.
// Queries use canonicalDocumentId internally, never page as business state.
// Wire requests remain snake_case and are translated at the API edge.

function captureAppError(action: () => unknown): AppError {
  try {
    action();
  } catch (err) {
    return err as AppError;
  }
  throw new Error("Expected action to throw");
}

describe("finding document request DTOs", () => {
  it("maps finding query document_id into canonicalDocumentId", () => {
    const query = parseFindingDocumentQuery({
      document_id: "11111111-1111-4111-8111-111111111111",
      job_id: "job_123",
      status: "pending",
      severity: "P1",
      rule_id: "GB-T-7713",
      rule_group: "reference",
    });

    expect(query).toEqual({
      canonicalDocumentId: "11111111-1111-4111-8111-111111111111",
      jobId: "job_123",
      status: "pending",
      severity: "P1",
      ruleId: "GB-T-7713",
      ruleGroup: "reference",
    });
    expect(toFindingListQuery(query)).toEqual({
      document_id: "11111111-1111-4111-8111-111111111111",
      job_id: "job_123",
      status: "pending",
      severity: "P1",
      rule_id: "GB-T-7713",
      rule_group: "reference",
    });
  });

  it("rejects page-centric finding queries", () => {
    const error = captureAppError(() => parseFindingDocumentQuery({ page: "" }));

    expect(error.statusCode).toBe(400);
    expect(error.message).toContain("must not use page");
  });

  it("maps finding sync into a canonical document command", () => {
    expect(parseFindingSyncCommand({
      job_id: "job_123",
      document_id: "11111111-1111-4111-8111-111111111111",
      findings: [],
    })).toEqual({
      jobId: "job_123",
      canonicalDocumentId: "11111111-1111-4111-8111-111111111111",
      findings: [],
    });
  });

  it("maps acknowledged P1 exemption into a canonical document command", () => {
    expect(parseP1ExemptionCommand({
      document_id: "11111111-1111-4111-8111-111111111111",
      actor_id: "author-1",
      actor_role: "Author",
      exempted_finding_ids: ["finding-1"],
      reason: "作者确认该 P1 风险不影响本次交稿，先行下载并承担风险。",
      acknowledged: true,
    })).toEqual({
      canonicalDocumentId: "11111111-1111-4111-8111-111111111111",
      actorId: "author-1",
      actorRole: "Author",
      exemptedFindingIds: ["finding-1"],
      reason: "作者确认该 P1 风险不影响本次交稿，先行下载并承担风险。",
      acknowledged: true,
    });
  });
});
