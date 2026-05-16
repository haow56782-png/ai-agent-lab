/**
 * Runtime-local download guard for the API gateway.
 * The shared-types package is type/source-only in this workspace, so Docker
 * runtime cannot import it as executable JS. Keep this pure guard aligned with
 * the shared contract while avoiding cross-package runtime imports.
 */
import type { ExemptionRecord, FindingContract, FindingStatus } from "../../../../packages/shared-types/src/finding-contract";
import type { JobStatus } from "../../../../packages/shared-types/src/job-contract";

export type DownloadBlockReason =
  | "JOB_NOT_COMPLETED"
  | "P0_PENDING"
  | "P1_PENDING_REQUIRES_EXEMPTION";

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

const PENDING_STATUSES: FindingStatus[] = ["pending", "needs_manual_review"];

function isPendingStatus(status: FindingStatus): boolean {
  return PENDING_STATUSES.includes(status);
}

export function canDownloadByFindings(input: FindingDownloadGuardInput): FindingDownloadGuardResult {
  const findings = input.findings ?? [];
  const p1Exemption = input.p1Exemption ?? null;
  const pendingP0FindingIds = findings
    .filter((finding) => finding.severity === "P0" && isPendingStatus(finding.status))
    .map((finding) => finding.finding_id);
  const pendingP1FindingIds = findings
    .filter((finding) => finding.severity === "P1" && isPendingStatus(finding.status))
    .map((finding) => finding.finding_id);
  const exemptedSet = new Set(p1Exemption?.exempted_finding_ids ?? []);
  const exemptedP1FindingIds = pendingP1FindingIds.filter((findingId) => exemptedSet.has(findingId));
  const unresolvedP1FindingIds = pendingP1FindingIds.filter((findingId) => !exemptedSet.has(findingId));

  const reasons: DownloadBlockReason[] = [];
  if (input.jobStatus !== "completed") reasons.push("JOB_NOT_COMPLETED");
  if (pendingP0FindingIds.length > 0) reasons.push("P0_PENDING");
  if (unresolvedP1FindingIds.length > 0) reasons.push("P1_PENDING_REQUIRES_EXEMPTION");

  const message = reasons.length === 0
    ? null
    : reasons.includes("JOB_NOT_COMPLETED")
    ? "交付文件还在生成中，完成后才能下载真实 DOCX。"
    : reasons.includes("P0_PENDING")
    ? `还有 ${pendingP0FindingIds.length} 项 P0 发现必须处理，P0 不能豁免。`
    : `还有 ${unresolvedP1FindingIds.length} 项 P1 发现需要处理或签字豁免。`;

  return {
    allowed: reasons.length === 0,
    reasons,
    pendingP0FindingIds,
    pendingP1FindingIds,
    exemptedP1FindingIds,
    unresolvedP1FindingIds,
    message,
  };
}
