import { v4 as uuidv4 } from "uuid";
import { query } from "../db.js";
function toPublicFinding(row) {
    return {
        ...row.payload_json,
        finding_id: row.finding_id,
        document_id: row.document_id,
        document_version: row.document_version,
        rule_id: row.rule_id,
        rule_group: row.rule_group ?? row.payload_json.rule_group,
        severity: row.severity,
        status: row.status,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}
function createAuditRecord(input) {
    return {
        audit_id: uuidv4(),
        target_type: input.targetType,
        target_id: input.targetId,
        actor_id: input.actorId,
        actor_role: input.actorRole,
        action: input.action,
        from_state: input.fromState,
        to_state: input.toState,
        snapshot_ref: input.snapshotRef,
        metadata: input.metadata,
        timestamp: input.timestamp ?? new Date().toISOString(),
    };
}
async function insertAudit(record) {
    await query(`INSERT INTO audit_records (
      audit_id, target_type, target_id, actor_id, actor_role, action,
      from_state, to_state, snapshot_ref, metadata, timestamp
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`, [
        record.audit_id,
        record.target_type,
        record.target_id,
        record.actor_id,
        record.actor_role,
        record.action,
        record.from_state ?? null,
        record.to_state ?? null,
        record.snapshot_ref ?? null,
        record.metadata ?? null,
        record.timestamp,
    ]);
}
export async function upsertFindings(input) {
    const rows = [];
    for (const finding of input.findings) {
        const payload = {
            ...finding,
            document_id: input.documentId,
            updated_at: new Date().toISOString(),
            audit_trail: finding.audit_trail ?? [],
        };
        const result = await query(`INSERT INTO findings (
        finding_id, job_id, document_id, document_version, rule_id, rule_group,
        severity, status, payload_json, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (finding_id) DO UPDATE SET
        job_id = EXCLUDED.job_id,
        document_id = EXCLUDED.document_id,
        document_version = EXCLUDED.document_version,
        rule_id = EXCLUDED.rule_id,
        rule_group = EXCLUDED.rule_group,
        severity = EXCLUDED.severity,
        status = EXCLUDED.status,
        payload_json = EXCLUDED.payload_json,
        updated_at = EXCLUDED.updated_at
      RETURNING *`, [
            payload.finding_id,
            input.jobId ?? null,
            input.documentId,
            payload.document_version,
            payload.rule_id,
            payload.rule_group ?? null,
            payload.severity,
            payload.status,
            payload,
            payload.created_at,
            payload.updated_at,
        ]);
        rows.push(toPublicFinding(result.rows[0]));
    }
    return rows;
}
export async function listFindings(filter) {
    const clauses = [];
    const values = [];
    const addClause = (sql, value) => {
        values.push(value);
        clauses.push(sql.replace("?", `$${values.length}`));
    };
    if (filter.document_id)
        addClause("document_id = ?", filter.document_id);
    if (filter.job_id)
        addClause("job_id = ?", filter.job_id);
    if (filter.status)
        addClause("status = ?", filter.status);
    if (filter.severity)
        addClause("severity = ?", filter.severity);
    if (filter.rule_id)
        addClause("rule_id = ?", filter.rule_id);
    if (filter.rule_group)
        addClause("rule_group = ?", filter.rule_group);
    const result = await query(`SELECT * FROM findings
     ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""}
     ORDER BY (payload_json->'evidence_spans'->0->>'page')::int ASC, created_at ASC`, values);
    return result.rows.map(toPublicFinding);
}
export async function getFinding(findingId) {
    const result = await query("SELECT * FROM findings WHERE finding_id = $1", [findingId]);
    return result.rows[0] ? toPublicFinding(result.rows[0]) : null;
}
export async function setFindingStatus(input) {
    const existing = await getFinding(input.findingId);
    if (!existing)
        return null;
    const timestamp = new Date().toISOString();
    const audit = createAuditRecord({
        targetType: "finding",
        targetId: input.findingId,
        actorId: input.actorId,
        actorRole: input.actorRole,
        action: input.action,
        fromState: existing.status,
        toState: input.status,
        snapshotRef: `finding-snapshot:${input.findingId}`,
        metadata: input.reason ? { reason: input.reason } : undefined,
        timestamp,
    });
    const payload = {
        ...existing,
        status: input.status,
        updated_at: timestamp,
        audit_trail: [...existing.audit_trail, audit],
    };
    await insertAudit(audit);
    const result = await query(`UPDATE findings
     SET status = $1, payload_json = $2, updated_at = $3
     WHERE finding_id = $4
     RETURNING *`, [input.status, payload, timestamp, input.findingId]);
    return result.rows[0] ? toPublicFinding(result.rows[0]) : null;
}
export async function recordP1Exemption(input) {
    const timestamp = new Date().toISOString();
    const record = {
        exempted_finding_ids: input.findingIds,
        actor_id: input.actorId,
        actor_role: input.actorRole,
        reason: input.reason,
        acknowledged: true,
        timestamp,
    };
    const audits = input.findingIds.map((findingId) => createAuditRecord({
        targetType: "exemption",
        targetId: findingId,
        actorId: input.actorId,
        actorRole: input.actorRole,
        action: "exempt",
        snapshotRef: `finding-snapshot:${findingId}`,
        metadata: { document_id: input.documentId, exemption_reason: input.reason },
        timestamp,
    }));
    for (const audit of audits) {
        await insertAudit(audit);
    }
    return { record, audits };
}
export async function listP1ExemptedFindingIds(documentId) {
    const result = await query(`SELECT target_id
       FROM audit_records
      WHERE target_type = 'exemption'
        AND action = 'exempt'
        AND metadata->>'document_id' = $1`, [documentId]);
    return result.rows.map((row) => row.target_id);
}
