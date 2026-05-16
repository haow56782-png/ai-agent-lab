import type { FixType } from "../../../../../packages/shared-types/src/job-contract";
import { FIX_SUMMARIES } from "./fix-artifact-builder.js";
import type { CompletedFixStep } from "./fix-progress-model.js";

export function getCompletedFixStepDuration(fixIndex: number): number {
  return 1 + (fixIndex % 3);
}

export function makeCompletedFixStep(fixType: FixType, fixIndex: number): CompletedFixStep {
  return {
    type: fixType,
    status: "done",
    summary: FIX_SUMMARIES[fixType],
    duration: getCompletedFixStepDuration(fixIndex),
  };
}
