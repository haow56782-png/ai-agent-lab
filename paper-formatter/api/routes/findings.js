import { Router } from "express";
import { createError, ERROR_CODES } from "../middleware/error-handler.js";
import { parseFindingDocumentQuery, parseFindingSyncCommand, parseP1ExemptionCommand, toFindingListQuery, } from "../dto/finding-document-requests.js";
import * as findingRepo from "../repositories/findings.js";
export const findingRoutes = Router();
function requireActor(body) {
    if (!body.actor_id || !body.actor_role) {
        throw createError(400, ERROR_CODES.VALIDATION_ERROR, "actor_id and actor_role are required");
    }
    return { actorId: body.actor_id, actorRole: body.actor_role };
}
findingRoutes.get("/", async (req, res, next) => {
    try {
        const query = parseFindingDocumentQuery(req.query);
        res.json(await findingRepo.listFindings(toFindingListQuery(query)));
    }
    catch (err) {
        next(err);
    }
});
findingRoutes.post("/sync", async (req, res, next) => {
    try {
        const command = parseFindingSyncCommand(req.body);
        const findings = await findingRepo.upsertFindings({
            jobId: command.jobId,
            documentId: command.canonicalDocumentId,
            findings: command.findings,
        });
        res.json({
            upserted_count: findings.length,
            finding_ids: findings.map((finding) => finding.finding_id),
        });
    }
    catch (err) {
        next(err);
    }
});
findingRoutes.post("/exempt-p1", async (req, res, next) => {
    try {
        const command = parseP1ExemptionCommand(req.body);
        const result = await findingRepo.recordP1Exemption({
            documentId: command.canonicalDocumentId,
            findingIds: command.exemptedFindingIds,
            actorId: command.actorId,
            actorRole: command.actorRole,
            reason: command.reason,
        });
        res.json({
            exemption_record: result.record,
            audit_ids: result.audits.map((audit) => audit.audit_id),
        });
    }
    catch (err) {
        next(err);
    }
});
findingRoutes.post("/:findingId/accept", async (req, res, next) => {
    try {
        const actor = requireActor(req.body);
        const finding = await findingRepo.setFindingStatus({
            findingId: req.params.findingId,
            status: "accepted",
            actorId: actor.actorId,
            actorRole: actor.actorRole,
            action: "accept",
        });
        if (!finding)
            throw createError(404, ERROR_CODES.NOT_FOUND, "Finding not found");
        res.json(finding);
    }
    catch (err) {
        next(err);
    }
});
findingRoutes.post("/:findingId/reject", async (req, res, next) => {
    try {
        const body = req.body;
        const actor = requireActor(body);
        const finding = await findingRepo.setFindingStatus({
            findingId: req.params.findingId,
            status: "rejected",
            actorId: actor.actorId,
            actorRole: actor.actorRole,
            action: "reject",
            reason: body.reason,
        });
        if (!finding)
            throw createError(404, ERROR_CODES.NOT_FOUND, "Finding not found");
        res.json(finding);
    }
    catch (err) {
        next(err);
    }
});
findingRoutes.post("/:findingId/self-edit", async (req, res, next) => {
    try {
        const body = req.body;
        if (!body.actor_id || !body.new_text || !Array.isArray(body.affected_spans)) {
            throw createError(400, ERROR_CODES.VALIDATION_ERROR, "actor_id, new_text and affected_spans are required");
        }
        const finding = await findingRepo.setFindingStatus({
            findingId: req.params.findingId,
            status: "self_edited",
            actorId: body.actor_id,
            actorRole: "Author",
            action: "self_edit",
            reason: body.new_text,
        });
        if (!finding)
            throw createError(404, ERROR_CODES.NOT_FOUND, "Finding not found");
        res.json({ finding, affected_finding_ids: [req.params.findingId] });
    }
    catch (err) {
        next(err);
    }
});
