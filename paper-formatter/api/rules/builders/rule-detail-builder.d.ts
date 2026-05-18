import type { JobRuleDetail } from "../../../../../packages/shared-types/src/job-contract";
import { FLOATING_OBJECT_OVERLAP_LABEL, FLOATING_OBJECT_OVERLAP_RULE_ID } from "../detectors/floating-object-overlap.detector.js";
import type { RuleDetection } from "../rule-types.js";
export declare function buildRuleDetailsFromDetections(input: {
    sections: any[];
    paragraphs: any[];
    detections: RuleDetection[];
}): JobRuleDetail[];
export { FLOATING_OBJECT_OVERLAP_LABEL, FLOATING_OBJECT_OVERLAP_RULE_ID };
