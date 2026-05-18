import { FIX_SUMMARIES } from "./fix-artifact-builder.js";
export function getCompletedFixStepDuration(fixIndex) {
    return 1 + (fixIndex % 3);
}
export function makeCompletedFixStep(fixType, fixIndex) {
    return {
        type: fixType,
        status: "done",
        summary: FIX_SUMMARIES[fixType],
        duration: getCompletedFixStepDuration(fixIndex),
    };
}
