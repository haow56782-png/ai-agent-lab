/** ============================================================
 *  ADR Types — Architecture Decision Record
 *
 *  ADRs are immutable once finalized. Each ADR captures a
 *  single architectural decision with context, alternatives,
 *  rationale, and impact analysis.
 *  ============================================================ */

export type AdrStatus = "draft" | "final" | "superseded" | "deprecated";

export type AdrCategory =
  | "module_boundary"
  | "interface_contract"
  | "type_system"
  | "protocol"
  | "storage"
  | "communication"
  | "security"
  | "governance"
  | "migration";

export interface AdrAlternative {
  name: string;
  description: string;
  pros: string[];
  cons: string[];
  feasibilityScore: number; // 0–1
}

export interface AdrImpact {
  module: string;
  description: string;
  severity: "low" | "medium" | "high" | "breaking";
}

export interface AdrMetadata {
  title: string;
  id: string;
  category: AdrCategory;
  status: AdrStatus;
  author: string;
  createdAt: string;
  finalizedAt?: string;
  supersededBy?: string;
  tags: string[];
}

export interface ArchitectureDecisionRecord {
  metadata: AdrMetadata;
  context: string;
  decision: string;
  rationale: string;
  alternatives: AdrAlternative[];
  selectedAlternative: string;
  invariants: string[];
  impacts: AdrImpact[];
  moduleBoundaries: string[];
  interfaces: string[];
  acceptanceCriteria: string[];
  supersedes?: string;
}

export interface AdrStore {
  save(adr: ArchitectureDecisionRecord): Promise<void>;
  get(id: string): Promise<ArchitectureDecisionRecord | null>;
  getAll(): Promise<ArchitectureDecisionRecord[]>;
  getByCategory(category: AdrCategory): Promise<ArchitectureDecisionRecord[]>;
  getByModule(module: string): Promise<ArchitectureDecisionRecord[]>;
  getLatestFinal(): Promise<ArchitectureDecisionRecord | null>;
}
