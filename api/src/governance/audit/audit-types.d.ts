/** ============================================================
 *  Audit Types — Governance audit log types
 *  ============================================================ */
export type AuditAction = "ROUTE_DECISION" | "FREEZE_TRANSITION" | "REVIEW_COMPLETED" | "ARBITRATION_COMPLETED" | "ADR_CREATED" | "ADR_FINALIZED" | "ADR_SUPERSEDED" | "DIFF_VALIDATION" | "INVARIANT_CHECK" | "THAW_INITIATED" | "THAW_COMPLETED";
export type AuditSeverity = "info" | "warning" | "error" | "critical";
export interface AuditEntry {
    id: string;
    timestamp: string;
    action: AuditAction;
    actor: string;
    severity: AuditSeverity;
    summary: string;
    details: Record<string, unknown>;
    relatedAdrId?: string;
    relatedTaskId?: string;
}
export interface RoutingLogEntry {
    timestamp: string;
    taskId: string;
    taskType: string;
    selectedModel: "claude-opus" | "openai" | "deepseek-pro" | "deepseek-flash";
    selectionReason: string;
    taskComplexity: "low" | "medium" | "high" | "architecture";
    estimatedCostMultiplier: number;
}
export interface GovernanceEvent {
    id: string;
    timestamp: string;
    type: AuditAction;
    actor: string;
    data: Record<string, unknown>;
}
export interface AuditStore {
    append(entry: AuditEntry): Promise<void>;
    query(filters: Partial<AuditEntry>): Promise<AuditEntry[]>;
    getByAction(action: AuditAction): Promise<AuditEntry[]>;
    getByAdr(adrId: string): Promise<AuditEntry[]>;
    getRange(from: string, to: string): Promise<AuditEntry[]>;
}
//# sourceMappingURL=audit-types.d.ts.map