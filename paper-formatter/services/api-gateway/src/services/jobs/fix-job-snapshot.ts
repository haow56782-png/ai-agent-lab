import type { FixJobArtifact, FixJobEvent, FixResult, FixType } from "../../../../../packages/shared-types/src/job-contract";
import { buildFixProgressMeta, type CompletedFixStep } from "./fix-progress-model.js";

interface FixJobSnapshotBase {
  fixTypes: FixType[];
  completedSteps: CompletedFixStep[];
  events: FixJobEvent[];
  artifacts: FixJobArtifact[];
  findingTotal: number;
}

interface ProcessingFixJobSnapshotInput extends FixJobSnapshotBase {
  message: string;
  currentStep?: FixType;
}

interface CompletedFixJobSnapshotInput extends FixJobSnapshotBase {
  message: string;
  outputPath: string;
  diffPath: string;
  result: FixResult;
}

interface FailedFixJobSnapshotInput extends FixJobSnapshotBase {
  message: string;
}

function buildSnapshotCore(snapshotBase: FixJobSnapshotBase) {
  return {
    fixTypes: snapshotBase.fixTypes,
    selectedFixes: snapshotBase.fixTypes,
    completedSteps: snapshotBase.completedSteps,
    events: snapshotBase.events,
    artifacts: snapshotBase.artifacts,
    ...buildFixProgressMeta(snapshotBase),
  };
}

export function buildProcessingFixJobSnapshot(snapshotInput: ProcessingFixJobSnapshotInput) {
  return {
    ...buildSnapshotCore(snapshotInput),
    currentStep: snapshotInput.currentStep,
    message: snapshotInput.message,
  };
}

export function buildCompletedFixJobSnapshot(snapshotInput: CompletedFixJobSnapshotInput) {
  return {
    outputPath: snapshotInput.outputPath,
    diffPath: snapshotInput.diffPath,
    ...buildSnapshotCore(snapshotInput),
    message: snapshotInput.message,
    result: snapshotInput.result,
  };
}

export function buildFailedFixJobSnapshot(snapshotInput: FailedFixJobSnapshotInput) {
  return {
    ...buildSnapshotCore(snapshotInput),
    message: snapshotInput.message,
  };
}
