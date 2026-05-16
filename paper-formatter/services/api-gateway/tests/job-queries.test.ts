import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/repositories/jobs.js", () => ({
  getJob: vi.fn(),
}));

vi.mock("../src/storage.js", () => ({
  downloadFile: vi.fn(),
}));

import { getPublicDiff, getPublicFixStatus } from "../src/services/job-queries.js";
import * as jobRepo from "../src/repositories/jobs.js";
import * as storage from "../src/storage.js";

describe("job query guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects diff requests for analyze jobs", async () => {
    vi.mocked(jobRepo.getJob).mockResolvedValue({
      job_id: "job_analyze",
      job_type: "analyze",
      status: "completed",
      progress: 100,
      stage: "done",
      doc_id: "doc_demo",
      profile_id: "USTC-vAuto",
      plan_id: null,
      error_code: null,
      error_message: null,
      estimated_sec: 30,
      result_json: {},
      started_at: "2026-05-12T10:00:00.000Z",
      completed_at: "2026-05-12T10:00:30.000Z",
      created_at: "2026-05-12T10:00:00.000Z",
    });

    await expect(getPublicDiff("job_analyze")).rejects.toMatchObject({
      statusCode: 400,
      code: "VALIDATION_ERROR",
      message: "Job does not produce diff output",
    });
  });

  it("keeps serving diff payloads for format jobs", async () => {
    vi.mocked(jobRepo.getJob).mockResolvedValue({
      job_id: "job_format",
      job_type: "format",
      status: "completed",
      progress: 100,
      stage: "done",
      doc_id: "doc_demo",
      profile_id: "USTC-vAuto",
      plan_id: null,
      error_code: null,
      error_message: null,
      estimated_sec: 30,
      result_json: {
        diffPath: "doc_demo/diff.json",
      },
      started_at: "2026-05-12T10:00:00.000Z",
      completed_at: "2026-05-12T10:00:30.000Z",
      created_at: "2026-05-12T10:00:00.000Z",
    });
    vi.mocked(storage.downloadFile).mockResolvedValue(Buffer.from(JSON.stringify({
      diffs: [
        {
          finding_id: "11111111-1111-4111-8111-111111111111",
          page: 2,
          type: "annotation",
          action: "annotate",
          element: "reference",
          before: "旧参考文献",
          after: "新参考文献",
          position: "2.1",
          note: "补全参考文献信息",
        },
      ],
      summary: {
        pages: 2,
        changeCount: 1,
        contentChanges: 0,
        formatChanges: 1,
      },
      integrity: {
        contentLevel: {
          match: true,
          originalBlockCount: 12,
          outputBlockCount: 12,
          originalContentHash: "hash_original",
          outputContentHash: "hash_output",
          mismatchCount: 0,
          mismatches: [],
        },
      },
    })));

    await expect(getPublicDiff("job_format")).resolves.toMatchObject({
      integrity: {
        contentLevel: {
          match: true,
          originalBlockCount: 12,
          outputBlockCount: 12,
        },
      },
      summary: {
        changeCount: 1,
      },
      diffs: [
        {
          finding_id: "11111111-1111-4111-8111-111111111111",
          page: 2,
          type: "annotation",
        },
      ],
    });
  });

  it("serves fix-status with distinct total, auto-fixable, fixed, and not-auto-fixed finding counts", async () => {
    vi.mocked(jobRepo.getJob).mockResolvedValue({
      job_id: "job_fix",
      job_type: "fix",
      status: "completed",
      progress: 100,
      stage: "done",
      doc_id: "doc_demo",
      profile_id: "USTC-vAuto",
      plan_id: null,
      error_code: null,
      error_message: null,
      estimated_sec: 180,
      result_json: {
        fixTypes: ["margin", "body_style", "caption", "page_number", "heading"],
        completedSteps: [
          { type: "margin", status: "done", summary: "页边距已写回", duration: 1 },
          { type: "body_style", status: "done", summary: "正文样式已写回", duration: 1 },
          { type: "caption", status: "done", summary: "图表题注已写回", duration: 1 },
          { type: "page_number", status: "done", summary: "页码已写回", duration: 1 },
          { type: "heading", status: "done", summary: "标题已写回", duration: 1 },
        ],
        events: [],
        artifacts: [
          { id: "art_margin", fixType: "margin", title: "页边距", summary: "已写回", details: [], status: "ready", finding_id: "finding-1" },
          { id: "art_body", fixType: "body_style", title: "正文", summary: "已写回", details: [], status: "ready", finding_id: "finding-2" },
          { id: "art_caption", fixType: "caption", title: "图表题注", summary: "建议人工确认", details: [], status: "needs_review", finding_id: "finding-4" },
          { id: "art_page", fixType: "page_number", title: "页码", summary: "已写回", details: [], status: "ready", finding_id: "finding-3" },
          { id: "art_heading", fixType: "heading", title: "标题", summary: "已写回", details: [], status: "ready", finding_id: "finding-3" },
        ],
        findingTotal: 6,
        fixedFindingTotal: 6,
        message: "修复稿已生成，可进入人工确认",
        result: {
          fixedFileId: "outputs/doc_001/thesis_fixed.docx",
          totalFixed: 5,
          totalFindings: 6,
          newScore: 96,
          contentHash: "content-hash",
          originalHash: "original-hash",
        },
      },
      started_at: "2026-05-12T10:00:00.000Z",
      completed_at: "2026-05-12T10:03:00.000Z",
      created_at: "2026-05-12T10:00:00.000Z",
    });

    await expect(getPublicFixStatus("job_fix")).resolves.toMatchObject({
      status: "done",
      findingTotal: 6,
      autoFixableFindingTotal: 3,
      fixedFindingTotal: 3,
      needsReviewFindingTotal: 1,
      notAutoFixedFindingTotal: 2,
      actionTotal: 5,
      completedActionTotal: 5,
    });
  });
});
