/**
 * ADR Types — Cognitive Architecture Decision Record definitions.
 *
 * Supports markdown expression, machine-readable JSON expression,
 * future replay, and governance graph relations.
 *
 * ============================================================
 *  P3.0 Architecture Memory & Governance Persistence
 * ============================================================ */

import type {
  AdrStatus,
  AdrReviewLevel,
  DriftRiskLevel,
  ConstitutionalImpact,
} from "./governance-memory-types.js";

/* ── Cognitive ADR ──────────────────────────────────────── */

export interface CognitiveAdrInput {
  title: string;
  decision: string;
  context: string;
  problemStatement: string;
  rationale: string;
  rejectedAlternatives: string[];
  reviewLevel: AdrReviewLevel;
  driftRisk: DriftRiskLevel;
  constitutionalImpact: ConstitutionalImpact;
  externalReviewerFindings?: string[];
  arbitrationOutcome?: string;
  freezeVersion?: string;
  futureConstraints?: string[];
  reversalConditions?: string[];
  relatedInvariants?: string[];
  relatedADRs?: string[];
}

export interface CognitiveAdrJson {
  id: string;
  title: string;
  status: AdrStatus;
  reviewLevel: AdrReviewLevel;
  freezeVersion: string;
  timestamp: string;
  decision: string;
  context: string;
  problemStatement: string;
  rationale: string;
  rejectedAlternatives: string[];
  externalReviewerFindings: string[];
  arbitrationOutcome: string;
  driftRisk: DriftRiskLevel;
  constitutionalImpact: ConstitutionalImpact;
  futureConstraints: string[];
  reversalConditions: string[];
  relatedInvariants: string[];
  relatedADRs: string[];
  decisionHash: string;
}

/* ── ADR Store Entry (persistent record) ────────────────── */

export interface AdrStoreEntry {
  adr: CognitiveAdrJson;
  createdAt: string;
  updatedAt: string;
  supersededBy?: string; // ADR ID that supersedes this one
}

/* ── ADR Validation ─────────────────────────────────────── */

export interface AdrValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/* ── ADR Store Interface ────────────────────────────────── */

export interface AdrStore {
  createADR(input: CognitiveAdrInput): CognitiveAdrJson;
  appendADR(adr: CognitiveAdrJson): void;
  getADRById(id: string): CognitiveAdrJson | undefined;
  listADRs(): CognitiveAdrJson[];
  linkRelatedADR(sourceId: string, targetId: string, relationship: "SUPERSEDES" | "RELATED"): void;
  validateADR(input: CognitiveAdrInput): AdrValidationResult;
}
