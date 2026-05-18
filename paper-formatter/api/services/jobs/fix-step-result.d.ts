import type { FixType } from "../../../../../packages/shared-types/src/job-contract";
import type { CompletedFixStep } from "./fix-progress-model.js";
export declare function getCompletedFixStepDuration(fixIndex: number): number;
export declare function makeCompletedFixStep(fixType: FixType, fixIndex: number): CompletedFixStep;
