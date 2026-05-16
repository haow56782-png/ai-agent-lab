import type { JobPatch } from "../../../../../packages/shared-types/src/job-contract";
import * as jobRepo from "../../repositories/jobs.js";

interface FixJobProcessingUpdate {
  progress: number;
  stage: string;
  resultJson: Record<string, unknown>;
  startedAt?: string;
}

interface FixJobCompletedUpdate {
  resultJson: Record<string, unknown>;
  completedAt: string;
}

interface FixJobFailedUpdate {
  resultJson: Record<string, unknown>;
  errorMessage: string;
}

export function createFixJobStateUpdater(jobId: string) {
  const updateFixJob = (jobPatch: JobPatch) =>
    jobRepo.updateJob(jobId, jobPatch).catch((error) =>
      console.error(`[fix] Failed to update job ${jobId}:`, error.message)
    );

  return {
    markProcessing(processingUpdate: FixJobProcessingUpdate) {
      return updateFixJob({
        status: "processing",
        progress: processingUpdate.progress,
        stage: processingUpdate.stage,
        started_at: processingUpdate.startedAt,
        result_json: processingUpdate.resultJson,
      });
    },
    markCompleted(completedUpdate: FixJobCompletedUpdate) {
      return updateFixJob({
        status: "completed",
        progress: 100,
        stage: "done",
        completed_at: completedUpdate.completedAt,
        result_json: completedUpdate.resultJson,
      });
    },
    markFailed(failedUpdate: FixJobFailedUpdate) {
      return updateFixJob({
        status: "failed",
        progress: 0,
        stage: "error",
        error_message: failedUpdate.errorMessage,
        result_json: failedUpdate.resultJson,
      });
    },
  };
}
