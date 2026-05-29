import { FLOATING_OBJECT_OVERLAP_RULE_ID } from "./detectors/floating-object-overlap.detector.js";
import type { RuleDetection, RuleSeverity } from "./rule-types.js";

const SEVERITY_SCORE: Record<RuleSeverity, number> = {
  P0: 0,
  P1: 1,
  P2: 2,
  P3: 3,
};

const RULE_SOURCE_WEIGHT: Record<string, number> = {
  user: 500,
  school: 400,
  CAFA: 300,
  discipline: 250,
  GB: 200,
  system: 100,
};

function sourceWeight(detection: RuleDetection): number {
  return RULE_SOURCE_WEIGHT[detection.ruleSource ?? "system"] ?? RULE_SOURCE_WEIGHT.system;
}

function ruleRank(ruleId: string): number {
  if (ruleId === FLOATING_OBJECT_OVERLAP_RULE_ID) return 0;
  if (ruleId === "TABLE_KEEP_TOGETHER") return 1;
  return 10;
}

export function sortDetectionsByPriority(detections: RuleDetection[]): RuleDetection[] {
  return [...detections].sort((left, right) => {
    const severityDelta = SEVERITY_SCORE[left.severity] - SEVERITY_SCORE[right.severity];
    if (severityDelta !== 0) return severityDelta;
    const weightDelta = sourceWeight(right) - sourceWeight(left);
    if (weightDelta !== 0) return weightDelta;
    const ruleDelta = ruleRank(left.ruleId) - ruleRank(right.ruleId);
    if (ruleDelta !== 0) return ruleDelta;
    return right.confidence - left.confidence;
  });
}
