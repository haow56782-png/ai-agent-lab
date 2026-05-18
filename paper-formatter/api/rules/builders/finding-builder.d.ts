import type { FindingContract } from "../../../../../packages/shared-types/src/finding-contract";
import type { DocumentRecord } from "../../repositories/documents.js";
import type { RuleDetection } from "../rule-types.js";
export declare function buildFindingsFromDetections(input: {
    doc: DocumentRecord;
    profileId?: string;
    detections: RuleDetection[];
}): FindingContract[];
