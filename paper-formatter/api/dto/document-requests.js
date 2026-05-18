import { parseLegacyDocumentCommand } from "./job-document-requests.js";
import { readString, requireString } from "./request-fields.js";
export function parseDetectSchoolCommand(body) {
    return parseLegacyDocumentCommand(body);
}
export function parseAutoCreateSchoolCommand(body) {
    return {
        name: requireString(body, "name"),
        legacyDocId: readString(body, "docId"),
    };
}
export function parseShareReportCommand(body) {
    const legacyDocId = requireString(body, "fileId");
    return {
        legacyDocId,
        checkResultLegacyDocId: readString(body, "checkResultId") || legacyDocId,
    };
}
