import { readString, readStringArray, requireString } from "./request-fields.js";
// Job document DTO adapters.
// Public HTTP payloads still use legacy docId for compatibility.
// Service commands receive legacyDocId from shared-types.
// This keeps job commands separate from finding canonical document queries.
export function parseLegacyDocumentCommand(body, fieldName = "docId") {
    return { legacyDocId: requireString(body, fieldName) };
}
export function parseAnalyzeJobCommand(body) {
    return {
        ...parseLegacyDocumentCommand(body),
        profileId: readString(body, "profileId"),
    };
}
export function parseFormatJobCommand(body) {
    return {
        legacyDocId: readString(body, "docId"),
        jobId: readString(body, "jobId"),
        profileId: readString(body, "profileId"),
    };
}
export function parseFixJobCommand(body) {
    return {
        legacyDocId: readString(body, "docId"),
        jobId: readString(body, "jobId"),
        profileId: readString(body, "profileId"),
        fixTypes: readStringArray(body, "fixTypes"),
        selectedFixes: readStringArray(body, "selectedFixes"),
    };
}
