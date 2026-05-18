import * as jobRepo from "../../repositories/jobs.js";
export function createFixJobStateUpdater(jobId) {
    const updateFixJob = (jobPatch) => jobRepo.updateJob(jobId, jobPatch).catch((error) => console.error(`[fix] Failed to update job ${jobId}:`, error.message));
    return {
        markProcessing(processingUpdate) {
            return updateFixJob({
                status: "processing",
                progress: processingUpdate.progress,
                stage: processingUpdate.stage,
                started_at: processingUpdate.startedAt,
                result_json: processingUpdate.resultJson,
            });
        },
        markCompleted(completedUpdate) {
            return updateFixJob({
                status: "completed",
                progress: 100,
                stage: "done",
                completed_at: completedUpdate.completedAt,
                result_json: completedUpdate.resultJson,
            });
        },
        markFailed(failedUpdate) {
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
