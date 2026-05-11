// Phase 1 finding schema is the canonical client-side contract.
// It keeps Finding as the business fact and treats page as location only.
// UI components may project this type, but must not create synonym models.
// The schema is intentionally framework-free so tests and scripts can import it.
export const FINDING_SEVERITIES = ['P0', 'P1', 'P2'] as const;
export const FINDING_STATUSES = [
  'pending',
  'accepted',
  'ignored',
  'self_edited',
  'rejudging',
  'resolved',
  'failed',
  'conflicted',
] as const;

export type FindingSeverity = typeof FINDING_SEVERITIES[number];
export type FindingStatus = typeof FINDING_STATUSES[number];

export interface FindingRulePath {
  packageName: string;
  section: string;
  clause: string;
  label: string;
}

export interface FindingAnchorRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FindingAnchor {
  pageIndex?: number;
  blockId?: string;
  paragraphIndex?: number;
  charOffset?: number;
  rect?: FindingAnchorRect;
}

export interface FindingSpan {
  start: number;
  end: number;
  text?: string;
}

export interface FindingEvidenceSnapshot {
  text: string;
  contextBefore?: string;
  contextAfter?: string;
  source?: 'parser' | 'ocr' | 'manual' | 'repair-action' | 'unknown';
}

export interface FindingRuleSnapshot {
  ruleText: string;
  ruleVersion: string;
  ruleDescription?: string;
}

export interface FindingSuggestionSnapshot {
  type: 'replace' | 'insert' | 'delete' | 'annotate' | 'format-hint' | 'manual_only';
  before?: string;
  after?: string;
  explanation?: string;
}

export interface Finding {
  findingId: string;
  documentId: string;
  documentVersion: number;
  ruleId: string;
  rulePath: FindingRulePath;
  severity: FindingSeverity;
  confidence?: number;
  status: FindingStatus;
  anchor: FindingAnchor;
  span: FindingSpan;
  evidence_snapshot: FindingEvidenceSnapshot;
  rule_snapshot: FindingRuleSnapshot;
  suggestion_snapshot?: FindingSuggestionSnapshot;
  createdAt: string;
  updatedAt: string;
}

export interface FindingValidationResult {
  ok: boolean;
  errors: string[];
}

export function isFindingSeverity(value: unknown): value is FindingSeverity {
  return typeof value === 'string' && FINDING_SEVERITIES.includes(value as FindingSeverity);
}

export function isFindingStatus(value: unknown): value is FindingStatus {
  return typeof value === 'string' && FINDING_STATUSES.includes(value as FindingStatus);
}

export function validateFinding(finding: Finding): FindingValidationResult {
  const errors: string[] = [];
  if (!finding.findingId) errors.push('findingId is required');
  if (!finding.documentId) errors.push('documentId is required');
  if (!Number.isInteger(finding.documentVersion) || finding.documentVersion < 1) errors.push('documentVersion must be a positive integer');
  if (!finding.ruleId) errors.push('ruleId is required');
  if (!finding.rulePath.packageName || !finding.rulePath.clause || !finding.rulePath.label) errors.push('rulePath must be resolved from ruleId');
  if (!isFindingSeverity(finding.severity)) errors.push('severity must be P0, P1, or P2');
  if (!isFindingStatus(finding.status)) errors.push('status is not a supported Finding status');
  if (typeof finding.confidence === 'number' && (finding.confidence < 0 || finding.confidence > 1)) errors.push('confidence must be between 0 and 1');
  if (typeof finding.anchor.pageIndex === 'number' && finding.anchor.pageIndex < 0) errors.push('anchor.pageIndex must be zero or positive');
  if (finding.span.start < 0 || finding.span.end < finding.span.start) errors.push('span must be a valid start/end range');
  if (!finding.evidence_snapshot.text) errors.push('evidence_snapshot.text is required');
  if (!finding.rule_snapshot.ruleText || !finding.rule_snapshot.ruleVersion) errors.push('rule_snapshot requires ruleText and ruleVersion');
  if (!finding.createdAt || Number.isNaN(Date.parse(finding.createdAt))) errors.push('createdAt must be an ISO date string');
  if (!finding.updatedAt || Number.isNaN(Date.parse(finding.updatedAt))) errors.push('updatedAt must be an ISO date string');
  return { ok: errors.length === 0, errors };
}

export function assertFinding(finding: Finding): Finding {
  const result = validateFinding(finding);
  if (!result.ok) {
    throw new Error(`Invalid Finding: ${result.errors.join('; ')}`);
  }
  return finding;
}

