import type { FixJobArtifact, FixJobEvent, FixType } from "../../../../../packages/shared-types/src/job-contract";
import type { FixSourceContext } from "./fix-source-context.js";
export declare function makePreparingEvent(eventContext: {
    findingTotal: number;
    fixType?: FixType;
    sourceContext: FixSourceContext;
}): FixJobEvent;
export declare function makeDownloadingEvent(fixType?: FixType): FixJobEvent;
export declare function makeFormattingEvent(eventContext: {
    findingTotal: number;
    fixType?: FixType;
}): FixJobEvent;
export declare function makeArtifactEvent(fixType: FixType, artifact: FixJobArtifact): FixJobEvent;
export declare function makeUploadingEvent(): FixJobEvent;
export declare function makeDoneEvent(isPassthrough: boolean): FixJobEvent;
export declare function makeFailedEvent(errorMessage: string): FixJobEvent;
