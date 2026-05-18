/** ============================================================
 *  Thaw Protocol — Controlled architecture freeze release.
 *
 *  Thawing requires recorded reason and creates a new DRAFT
 *  cycle. The frozen state is preserved in history.
 *  ============================================================ */
import { transitionFreeze } from "./freeze-state-machine.js";
export function initiateThaw(entry, request) {
    if (entry.state !== "FROZEN") {
        throw new Error(`Cannot thaw: entry is in state "${entry.state}", expected "FROZEN"`);
    }
    if (!request.reason.trim()) {
        throw new Error("Thaw reason is required");
    }
    if (request.affectedInterfaces.length === 0 && request.riskAssessment !== "low") {
        throw new Error("Affected interfaces must be specified for medium/high risk thaws");
    }
    const previousFrozen = { ...entry };
    const thawedEntry = transitionFreeze(entry, "THAW", request.actor, request.reason, request.evidence);
    return {
        previousFrozen,
        thawedEntry,
        thawRequest: request,
        timestamp: new Date().toISOString(),
    };
}
export function canThawWithoutReview(request) {
    return request.riskAssessment === "low" && request.affectedInterfaces.length === 0;
}
export function generateThawReport(result) {
    const lines = [
        `# Architecture Thaw Report`,
        `**ADR**: ${result.thawedEntry.adrId}`,
        `**Thawed by**: ${result.thawRequest.actor}`,
        `**Timestamp**: ${result.timestamp}`,
        `**Reason**: ${result.thawRequest.reason}`,
        `**Risk Assessment**: ${result.thawRequest.riskAssessment}`,
        `**Requires Re-Freeze**: ${result.thawRequest.requiresReFreeze ? "Yes" : "No"}`,
        ``,
        `## Affected Interfaces`,
        ...result.thawRequest.affectedInterfaces.map((i) => `- ${i}`),
        ``,
        `## Planned Changes`,
        ...result.thawRequest.plannedChanges.map((c) => `- ${c}`),
        ``,
        `## Freeze History`,
        ...result.thawedEntry.history.map((h) => `- ${h.from} → ${h.to} (${h.reason})`),
    ];
    return lines.join("\n");
}
//# sourceMappingURL=thaw-protocol.js.map