function collectArtifactFindingIds(artifacts, includeArtifact = () => true) {
    const fixedFindingIds = new Set();
    for (const artifact of artifacts) {
        if (!includeArtifact(artifact))
            continue;
        if (artifact.finding_id)
            fixedFindingIds.add(artifact.finding_id);
        for (const relatedFindingId of artifact.related_finding_ids || [])
            fixedFindingIds.add(relatedFindingId);
    }
    return fixedFindingIds;
}
export function countFixedFindings(progressSnapshot) {
    const fixedFindingIds = collectArtifactFindingIds(progressSnapshot.artifacts, (artifact) => artifact.status === "ready");
    return Math.min(progressSnapshot.findingTotal, fixedFindingIds.size || progressSnapshot.completedSteps.length);
}
export function countAutoFixableFindings(progressSnapshot) {
    const artifactFindingIds = collectArtifactFindingIds(progressSnapshot.artifacts, (artifact) => artifact.status === "ready");
    return Math.min(progressSnapshot.findingTotal, artifactFindingIds.size || progressSnapshot.fixTypes.length);
}
export function countNeedsReviewFindings(progressSnapshot) {
    const needsReviewFindingIds = collectArtifactFindingIds(progressSnapshot.artifacts, (artifact) => artifact.status === "needs_review");
    return Math.min(progressSnapshot.findingTotal, needsReviewFindingIds.size);
}
export function buildFixProgressMeta(progressSnapshot) {
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
export function getFixStepProgress(fixIndex, fixTypeTotal) {
    return Math.min(55 + Math.round(((fixIndex + 1) / Math.max(fixTypeTotal, 1)) * 25), 82);
}
