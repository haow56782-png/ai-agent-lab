import type { FixJobArtifact, FixStepResult, FixType } from "../../../../../packages/shared-types/src/job-contract";

export type CompletedFixStep = FixStepResult & { status: "done" };

export interface FixProgressMeta {
  findingTotal: number;
  autoFixableFindingTotal: number;
  fixedFindingTotal: number;
  needsReviewFindingTotal: number;
  notAutoFixedFindingTotal: number;
  actionTotal: number;
  completedActionTotal: number;
}

function collectArtifactFindingIds(
  artifacts: FixJobArtifact[],
  includeArtifact: (artifact: FixJobArtifact) => boolean = () => true,
): Set<string> {
  const fixedFindingIds = new Set<string>();
  for (const artifact of artifacts) {
    if (!includeArtifact(artifact)) continue;
    if (artifact.finding_id) fixedFindingIds.add(artifact.finding_id);
    for (const relatedFindingId of artifact.related_finding_ids || []) fixedFindingIds.add(relatedFindingId);
  }
  return fixedFindingIds;
}

export function countFixedFindings(progressSnapshot: {
  artifacts: FixJobArtifact[];
  completedSteps: CompletedFixStep[];
  findingTotal: number;
}): number {
  const fixedFindingIds = collectArtifactFindingIds(progressSnapshot.artifacts, (artifact) => artifact.status === "ready");
  return Math.min(progressSnapshot.findingTotal, fixedFindingIds.size || progressSnapshot.completedSteps.length);
}

export function countAutoFixableFindings(progressSnapshot: {
  artifacts: FixJobArtifact[];
  fixTypes: FixType[];
  findingTotal: number;
}): number {
  const artifactFindingIds = collectArtifactFindingIds(progressSnapshot.artifacts, (artifact) => artifact.status === "ready");
  return Math.min(progressSnapshot.findingTotal, artifactFindingIds.size || progressSnapshot.fixTypes.length);
}

export function countNeedsReviewFindings(progressSnapshot: {
  artifacts: FixJobArtifact[];
  findingTotal: number;
}): number {
  const needsReviewFindingIds = collectArtifactFindingIds(progressSnapshot.artifacts, (artifact) => artifact.status === "needs_review");
  return Math.min(progressSnapshot.findingTotal, needsReviewFindingIds.size);
}

export function buildFixProgressMeta(progressSnapshot: {
  artifacts: FixJobArtifact[];
  completedSteps: CompletedFixStep[];
  findingTotal: number;
  fixTypes: FixType[];
}): FixProgressMeta {
  const autoFixableFindingTotal = countAutoFixableFindings(progressSnapshot);
  const fixedFindingTotal = countFixedFindings(progressSnapshot);
  const needsReviewFindingTotal = countNeedsReviewFindings(progressSnapshot);
  return {
    findingTotal: progressSnapshot.findingTotal,
    autoFixableFindingTotal,
    fixedFindingTotal,
    needsReviewFindingTotal,
    notAutoFixedFindingTotal: Math.max(0, progressSnapshot.findingTotal - fixedFindingTotal - needsReviewFindingTotal),
    actionTotal: progressSnapshot.fixTypes.length,
    completedActionTotal: progressSnapshot.completedSteps.length,
  };
}

export function getFixStepProgress(fixIndex: number, fixTypeTotal: number): number {
  return Math.min(55 + Math.round(((fixIndex + 1) / Math.max(fixTypeTotal, 1)) * 25), 82);
}
