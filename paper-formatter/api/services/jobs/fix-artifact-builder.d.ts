import type { FixJobArtifact, FixJobEvent, FixType } from "../../../../../packages/shared-types/src/job-contract";
import type { FixSourceContext } from "./fix-source-context.js";
export declare const FIX_SUMMARIES: Record<FixType, string>;
export declare function makeFixEvent(eventFields: {
    type: FixJobEvent["type"];
    stage: string;
    title: string;
    detail: string;
    fixType?: FixType;
    finding_id?: string;
    related_finding_ids?: string[];
}): FixJobEvent;
export declare function getFixArtifactDetailText(fixType: FixType): string;
export declare function makeFixArtifact(fixType: FixType, sourceContext: FixSourceContext, sourceIndex: number, formatterDiff?: any): FixJobArtifact;
