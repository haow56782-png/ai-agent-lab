import type { LegacyDocumentCommand } from "../../../../packages/shared-types/src/job-contract";
import { parseLegacyDocumentCommand } from "./job-document-requests.js";
import { readString, requireString } from "./request-fields.js";

// Profile/share document DTO adapters.
// Job and finding parsers live in domain-specific DTO files.
// This file keeps the remaining edge-only document commands small and explicit.

export type DetectSchoolCommand = LegacyDocumentCommand;

export interface AutoCreateSchoolCommand {
  name: string;
  legacyDocId?: string;
}

export interface ShareReportCommand extends LegacyDocumentCommand {
  checkResultLegacyDocId: string;
}

export function parseDetectSchoolCommand(body: unknown): DetectSchoolCommand {
  return parseLegacyDocumentCommand(body);
}

export function parseAutoCreateSchoolCommand(body: unknown): AutoCreateSchoolCommand {
  return {
    name: requireString(body, "name"),
    legacyDocId: readString(body, "docId"),
  };
}

export function parseShareReportCommand(body: unknown): ShareReportCommand {
  const legacyDocId = requireString(body, "fileId");
  return {
    legacyDocId,
    checkResultLegacyDocId: readString(body, "checkResultId") || legacyDocId,
  };
}
