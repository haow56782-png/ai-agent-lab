import { FLOATING_OBJECT_OVERLAP_RULE_ID } from "./detectors/floating-object-overlap.detector.js";
const SEVERITY_SCORE = {
    P0: 0,
    P1: 1,
    P2: 2,
    P3: 3,
};
function ruleRank(ruleId) {
    if (ruleId === FLOATING_OBJECT_OVERLAP_RULE_ID)
        return 0;
    if (ruleId === "TABLE_KEEP_TOGETHER")
        return 1;
    return 10;
}
export function sortDetectionsByPriority(detections) {
    return [...detections].sort((left, right) => {
        const severityDelta = SEVERITY_SCORE[left.severity] - SEVERITY_SCORE[right.severity];
        if (severityDelta !== 0)
            return severityDelta;
        const ruleDelta = ruleRank(left.ruleId) - ruleRank(right.ruleId);
        if (ruleDelta !== 0)
            return ruleDelta;
        return right.confidence - left.confidence;
    });
}
