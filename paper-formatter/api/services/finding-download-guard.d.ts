/**
 * Runtime-local download guard for the API gateway.
 * The shared-types package is type/source-only in this workspace, so Docker
 * runtime cannot import it as executable JS. Keep this pure guard aligned with
 * the shared contract while avoiding cross-package runtime imports.
 */
import type { ExemptionRecord, FindingContract } from "../../../../packages/shared-types/src/finding-contract";
import type { JobStatus } from "../../../../packages/shared-types/src/job-contract";
export type DownloadBlockReason = "JOB_NOT_COMPLETED" | "P0_PENDING" | "P1_PENDING_REQUIRES_EXEMPTION";
export interface FindingDownloadGuardInput {
    jobStatus?: JobStatus | string | null;
    findings?: Array<Pick<FindingContract, "finding_id" | "severity" | "status">>;
    p1Exemption?: ExemptionRecord | null;
}
export interface FindingDownloadGuardResult {
    allowed: boolean;
    reasons: DownloadBlockReason[];
    pendingP0FindingIds: string[];
    pendingP1FindingIds: string[];
    exemptedP1FindingIds: string[];
    unresolvedP1FindingIds: string[];
    message: string | null;
}
export declare function canDownloadByFindings(input: FindingDownloadGuardInput): FindingDownloadGuardResult;
