export type FindingSeverity = "P0" | "P1" | "P2";
export type FindingRuleSource = "user" | "school" | "discipline" | "CAFA" | "GB" | "system";
export type FindingStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "self_edited"
  | "resolved"
  | "closed"
  | "superseded"
  | "needs_manual_review";

export type FindingSuggestionType = "replace" | "insert" | "delete" | "restructure" | "manual_only";
export type ActorRole = "Author" | "Reviewer" | "Admin" | "System";
export type AuditTargetType = "finding" | "document" | "batch" | "exemption" | "security";
export type AuditAction =
  | "create"
  | "accept"
  | "reject"
  | "self_edit"
  | "batch_accept"
  | "rejudge_trigger"
  | "rejudge_complete"
  | "rejudge_fail"
  | "exempt"
  | "export"
  | "finalize"
  | "undo"
  | "supersede"
  | "manual_review_complete"
  | "unauthorized_attempt";

export interface EvidenceSpan {
  page: number;
  char_start: number;
  char_end: number;
  snippet: string;
  context_before?: string;
  context_after?: string;
  metadata?: Record<string, unknown>;
}

export interface RuleSnapshot {
  rule_text: string;
  rule_version: string;
  rule_description?: string;
}

export interface FindingSuggestion {
  type: FindingSuggestionType;
  fix_diff?: {
    before: string;
    after: string;
    spans_affected: EvidenceSpan[];
  };
  explanation: string;
}

export interface AuditRecord {
  audit_id: string;
  target_type: AuditTargetType;
  target_id: string;
  actor_id: string;
  actor_role: ActorRole;
  action: AuditAction;
  timestamp: string;
  from_state?: string;
  to_state?: string;
  snapshot_ref?: string;
  metadata?: Record<string, unknown>;
}

export interface FindingContract {
  finding_id: string;
  document_id: string;
  document_version: number;
  rule_id: string;
  ruleSource?: FindingRuleSource;
  ruleLevel?: string;
  rule_group?: string;
  rule_snapshot: RuleSnapshot;
  severity: FindingSeverity;
  confidence: number;
  evidence_spans: EvidenceSpan[];
  evidence_snapshot: string;
  cross_page?: boolean;
  is_global?: boolean;
  suggestion: FindingSuggestion;
  status: FindingStatus;
  related_finding_ids?: string[];
  created_at: string;
  updated_at: string;
  closed_at?: string;
  audit_trail: AuditRecord[];
}

export interface ExemptionRecord {
  exempted_finding_ids: string[];
  actor_id: string;
  actor_role: "Author" | "Admin";
  reason: string;
  acknowledged: true;
  timestamp: string;
}

export interface FindingListQuery {
  document_id?: string;
  job_id?: string;
  status?: FindingStatus;
  severity?: FindingSeverity;
  rule_id?: string;
  rule_group?: string;
  cross_page?: boolean;
}

export interface FindingDocumentQuery {
  canonicalDocumentId?: string;
  jobId?: string;
  status?: FindingStatus;
  severity?: FindingSeverity;
  ruleId?: string;
  ruleGroup?: string;
}

export interface FindingDispositionRequest {
  actor_id: string;
  actor_role: ActorRole;
  reason?: string;
}

export interface FindingSelfEditRequest {
  actor_id: string;
  new_text: string;
  affected_spans: EvidenceSpan[];
}

export interface FindingSyncRequest {
  job_id?: string;
  document_id: string;
  findings: FindingContract[];
}

export interface FindingSyncCommand {
  jobId?: string;
  canonicalDocumentId: string;
  findings: FindingContract[];
}

export interface FindingSyncResponse {
  upserted_count: number;
  finding_ids: string[];
}

export interface P1ExemptionRequest {
  document_id: string;
  actor_id: string;
  actor_role: "Author" | "Admin";
  exempted_finding_ids: string[];
  reason: string;
  acknowledged: true;
}

export interface P1ExemptionCommand {
  canonicalDocumentId: string;
  actorId: string;
  actorRole: "Author" | "Admin";
  exemptedFindingIds: string[];
  reason: string;
  acknowledged: true;
}

export interface P1ExemptionResponse {
  exemption_record: ExemptionRecord;
  audit_ids: string[];
}
