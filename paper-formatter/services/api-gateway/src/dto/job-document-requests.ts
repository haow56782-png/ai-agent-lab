import type {
  AnalyzeJobCommand,
  FixJobCommand,
  FormatJobCommand,
  LegacyDocumentCommand,
} from "../../../../packages/shared-types/src/job-contract";
import { readString, readStringArray, requireString } from "./request-fields.js";

// Job document DTO adapters.
// Public HTTP payloads still use legacy docId for compatibility.
// Service commands receive legacyDocId from shared-types.
// This keeps job commands separate from finding canonical document queries.

export function parseLegacyDocumentCommand(body: unknown, fieldName = "docId"): LegacyDocumentCommand {
  return { legacyDocId: requireString(body, fieldName) };
}

export function parseAnalyzeJobCommand(body: unknown): AnalyzeJobCommand {
  return {
    ...parseLegacyDocumentCommand(body),
    profileId: readString(body, "profileId"),
  };
}

export function parseFormatJobCommand(body: unknown): FormatJobCommand {
  return {
    legacyDocId: readString(body, "docId"),
    jobId: readString(body, "jobId"),
    profileId: readString(body, "profileId"),
  };
}

export function parseFixJobCommand(body: unknown): FixJobCommand {
  return {
    legacyDocId: readString(body, "docId"),
    jobId: readString(body, "jobId"),
    profileId: readString(body, "profileId"),
    fixTypes: readStringArray(body, "fixTypes") as FixJobCommand["fixTypes"],
    selectedFixes: readStringArray(body, "selectedFixes") as FixJobCommand["selectedFixes"],
  };
}
