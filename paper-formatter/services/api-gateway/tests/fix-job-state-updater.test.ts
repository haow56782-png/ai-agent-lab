import { beforeEach, describe, expect, test, vi } from "vitest";
import { createFixJobStateUpdater } from "../src/services/jobs/fix-job-state-updater.js";

const jobRepoMock = vi.hoisted(() => ({
  updateJob: vi.fn(),
}));

vi.mock("../src/repositories/jobs.js", () => ({
  updateJob: jobRepoMock.updateJob,
}));

describe("fix job state updater", () => {
  beforeEach(() => {
    jobRepoMock.updateJob.mockReset();
    jobRepoMock.updateJob.mockResolvedValue(null);
  });

  test("writes processing patch with optional started_at", async () => {
    const fixJobState = createFixJobStateUpdater("job_fix_001");
    await fixJobState.markProcessing({
      progress: 5,
      stage: "preparing",
      startedAt: "2026-05-15T00:00:00.000Z",
      resultJson: { message: "正在准备发现项" },
    });

    expect(jobRepoMock.updateJob).toHaveBeenCalledWith("job_fix_001", {
      status: "processing",
      progress: 5,
      stage: "preparing",
      started_at: "2026-05-15T00:00:00.000Z",
      result_json: { message: "正在准备发现项" },
    });
  });

  test("writes completed patch with fixed stage contract", async () => {
    const fixJobState = createFixJobStateUpdater("job_fix_001");
    await fixJobState.markCompleted({
      completedAt: "2026-05-15T00:01:00.000Z",
      resultJson: { message: "修复稿已生成" },
    });

    expect(jobRepoMock.updateJob).toHaveBeenCalledWith("job_fix_001", {
      status: "completed",
      progress: 100,
      stage: "done",
      completed_at: "2026-05-15T00:01:00.000Z",
      result_json: { message: "修复稿已生成" },
    });
  });

  test("writes failed patch without throwing when repository update rejects", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    jobRepoMock.updateJob.mockRejectedValueOnce(new Error("database unavailable"));

    const fixJobState = createFixJobStateUpdater("job_fix_001");
    await fixJobState.markFailed({
      errorMessage: "formatter failed",
      resultJson: { message: "formatter failed" },
    });

    expect(jobRepoMock.updateJob).toHaveBeenCalledWith("job_fix_001", {
      status: "failed",
      progress: 0,
      stage: "error",
      error_message: "formatter failed",
      result_json: { message: "formatter failed" },
    });
    expect(consoleError).toHaveBeenCalledWith("[fix] Failed to update job job_fix_001:", "database unavailable");
    consoleError.mockRestore();
  });
});
