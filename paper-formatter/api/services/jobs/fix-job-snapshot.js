import { buildFixProgressMeta } from "./fix-progress-model.js";
function buildSnapshotCore(snapshotBase) {
    return {
        fixTypes: snapshotBase.fixTypes,
        selectedFixes: snapshotBase.fixTypes,
        completedSteps: snapshotBase.completedSteps,
        events: snapshotBase.events,
        artifacts: snapshotBase.artifacts,
        ...buildFixProgressMeta(snapshotBase),
    };
}
export function buildProcessingFixJobSnapshot(snapshotInput) {
    return {
        ...buildSnapshotCore(snapshotInput),
        currentStep: snapshotInput.currentStep,
        message: snapshotInput.message,
    };
}
export function buildCompletedFixJobSnapshot(snapshotInput) {
    return {
        outputPath: snapshotInput.outputPath,
        diffPath: snapshotInput.diffPath,
        ...buildSnapshotCore(snapshotInput),
        message: snapshotInput.message,
        result: snapshotInput.result,
    };
}
export function buildFailedFixJobSnapshot(snapshotInput) {
    return {
        ...buildSnapshotCore(snapshotInput),
        message: snapshotInput.message,
    };
}
