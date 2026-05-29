import { v4 as uuid } from "uuid";
import type { FindingContract, FindingSeverity } from "../../../../../packages/shared-types/src/finding-contract";
import type { DocumentRecord } from "../../repositories/documents.js";
import type { RuleDetection, RuleSeverity } from "../rule-types.js";

function toFindingSeverity(severity: RuleSeverity): FindingSeverity {
  if (severity === "P0" || severity === "P1" || severity === "P2") return severity;
  return "P2";
}

function createEvidenceSpan(detection: RuleDetection) {
  const metadata = {
    ...(detection.evidence?.anchor ? { anchor: detection.evidence.anchor } : {}),
    ...(detection.canonicalMapping ? { canonicalMapping: detection.canonicalMapping } : {}),
  };
  return {
    page: detection.page,
    char_start: 0,
    char_end: Math.max(detection.snippet.length, 1),
    snippet: detection.snippet,
    context_before: detection.evidence?.contextBefore,
    context_after: detection.evidence?.contextAfter,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
  };
}

export function buildFindingsFromDetections(input: {
  doc: DocumentRecord;
  profileId?: string;
  detections: RuleDetection[];
}): FindingContract[] {
  const now = new Date().toISOString();
  return input.detections.map((detection) => {
    const evidenceSpan = createEvidenceSpan(detection);
    return {
      finding_id: uuid(),
      document_id: input.doc.canonical_document_id,
      document_version: 1,
      rule_id: detection.ruleId,
      ruleSource: detection.ruleSource,
      ruleLevel: detection.ruleLevel,
      rule_group: detection.group,
      rule_snapshot: {
        rule_text: detection.label,
        rule_version: input.profileId || "vAuto",
        rule_description: detection.suggestion.explanation,
      },
      severity: toFindingSeverity(detection.severity),
      confidence: detection.confidence,
      evidence_spans: [evidenceSpan],
      evidence_snapshot: detection.snippet,
      cross_page: false,
      is_global: false,
      suggestion: {
        type: detection.suggestion.type === "manual_review" ? "manual_only" : detection.suggestion.type,
        fix_diff: {
          before: detection.suggestion.before,
          after: detection.suggestion.after,
          spans_affected: [evidenceSpan],
        },
        explanation: detection.suggestion.explanation,
      },
      status: "pending",
      created_at: now,
      updated_at: now,
      audit_trail: [],
    };
  });
}
