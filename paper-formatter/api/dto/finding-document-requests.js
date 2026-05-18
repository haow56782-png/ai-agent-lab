import { createError, ERROR_CODES } from "../middleware/error-handler.js";
import { hasKey, readString, readStringArray } from "./request-fields.js";
// Finding document DTO adapters.
// Wire payloads use snake_case contract fields from public APIs.
// Internal commands use canonicalDocumentId and camelCase names.
// Page state is rejected here to preserve finding-centric architecture.
export function parseFindingDocumentQuery(query) {
    if (hasKey(query, "page")) {
        throw createError(400, ERROR_CODES.VALIDATION_ERROR, "Finding queries must not use page as business state");
    }
    return {
        canonicalDocumentId: readString(query, "document_id"),
        jobId: readString(query, "job_id"),
        status: readString(query, "status"),
        severity: readString(query, "severity"),
        ruleId: readString(query, "rule_id"),
        ruleGroup: readString(query, "rule_group"),
    };
}
export function toFindingListQuery(query) {
    return {
        document_id: query.canonicalDocumentId,
        job_id: query.jobId,
        status: query.status,
        severity: query.severity,
        rule_id: query.ruleId,
        rule_group: query.ruleGroup,
    };
}
export function parseFindingSyncCommand(body) {
    const canonicalDocumentId = readString(body, "document_id");
    const findings = !body || typeof body !== "object" ? undefined : body.findings;
    if (!canonicalDocumentId || !Array.isArray(findings)) {
        throw createError(400, ERROR_CODES.VALIDATION_ERROR, "document_id and findings[] are required");
    }
    return {
        jobId: readString(body, "job_id"),
        canonicalDocumentId,
        findings: findings,
    };
}
export function parseP1ExemptionCommand(body) {
    const canonicalDocumentId = readString(body, "document_id");
    const exemptedFindingIds = readStringArray(body, "exempted_finding_ids");
    const actorId = readString(body, "actor_id");
    const actorRole = readString(body, "actor_role");
    const reason = readString(body, "reason");
    const acknowledged = Boolean(body && typeof body === "object" && body.acknowledged);
    if (!canonicalDocumentId || !exemptedFindingIds) {
        throw createError(400, ERROR_CODES.VALIDATION_ERROR, "document_id and exempted_finding_ids are required");
    }
    if (!actorId || (actorRole !== "Author" && actorRole !== "Admin")) {
        throw createError(403, ERROR_CODES.VALIDATION_ERROR, "Only Author or Admin can exempt P1 findings");
    }
    if (!acknowledged || !reason || reason.trim().length < 20) {
        throw createError(400, ERROR_CODES.VALIDATION_ERROR, "P1 exemption requires acknowledgement and a reason of at least 20 characters");
    }
    return {
        canonicalDocumentId,
        actorId,
        actorRole,
        exemptedFindingIds,
        reason: reason.trim(),
        acknowledged: true,
    };
}
