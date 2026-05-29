import type { DocumentRecord } from "../repositories/documents.js";
import type { SchoolProfile } from "../repositories/profiles.js";
import type { ObjectGraph } from "../parser/object-graph/types.js";

export type RuleSeverity = "P0" | "P1" | "P2" | "P3";
export type RuleSource = "user" | "school" | "discipline" | "CAFA" | "GB" | "system";

export type CanonicalRuleMappingStatus =
  | "mapped"
  | "missing_profile_rule"
  | "missing_mapping"
  | "no_profile_rules";

export interface CanonicalRuleMapping {
  detectorRuleId: string;
  canonicalRuleId?: string;
  resolvedRuleId: string;
  status: CanonicalRuleMappingStatus;
  reason: string;
}

export interface ParsedDocumentContext {
  doc: DocumentRecord;
  profile?: Pick<SchoolProfile, "school_id" | "rules_json" | "style_map"> | null;
  profileId?: string;
  discipline?: "stem" | "humanities" | "unknown";
  paragraphs: any[];
  sections: any[];
  images: any[];
  tables: any[];
  headings: any[];
  structureItems: any[];
  flowItems?: any[];
  objectGraph?: ObjectGraph | null;
}

export interface RuleDetection {
  detectorRuleId?: string;
  canonicalMapping?: CanonicalRuleMapping;
  ruleId: string;
  label: string;
  group: string;
  severity: RuleSeverity;
  ruleSource?: RuleSource;
  confidence: number;
  page: number;
  snippet: string;
  evidence?: {
    paragraphIndex?: number;
    contextBefore?: string;
    contextAfter?: string;
    bbox?: { x: number; y: number; w: number; h: number };
    objectName?: string;
    anchor?: {
      relationId: string;
      fromObjectId: string;
      toObjectId: string;
      relationType: string;
      captionKind?: "figure" | "table";
    };
  };
  suggestion: {
    type: "replace" | "restructure" | "manual_review";
    before: string;
    after: string;
    explanation: string;
  };
}

export interface FormatRuleDetector {
  ruleId: string;
  label: string;
  group: string;
  severity: RuleSeverity;
  detect(ctx: ParsedDocumentContext): RuleDetection[];
}
