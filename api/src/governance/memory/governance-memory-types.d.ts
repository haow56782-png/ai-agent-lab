/**
 * Governance Memory Types — Core type definitions for P3.0
 * Architecture Memory & Governance Persistence.
 *
 * These types are compatible with the existing ReviewLevel enum
 * from external-review-policy.ts (L0|L1|L2|L3) and integrate
 * with RoutingDecisionLog from review-types.ts.
 *
 * ============================================================
 *  P3.0 Architecture Memory & Governance Persistence
 * ============================================================ */
export type DriftRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type ConstitutionalImpact = "NONE" | "BOUNDARY" | "INVARIANT" | "AUTHORITY";
export type AdrStatus = "ACCEPTED" | "SUPERSEDED" | "REJECTED" | "FROZEN";
export type AdrReviewLevel = "L0" | "L1" | "L2" | "L3";
export type InvariantSeverity = "CONSTITUTIONAL" | "SECURITY" | "GOVERNANCE" | "ARCHITECTURE";
export type InvariantCategory = "authority" | "security" | "boundary" | "protocol";
export type GovernanceNodeType = "ADR" | "INVARIANT" | "FREEZE" | "REVIEW" | "ROUTING_DECISION" | "ARBITRATION";
export type GovernanceEdgeRelationship = "SUPERSEDES" | "RELATED" | "TOUCHES" | "REVIEWED_BY" | "ARBITRATED_BY" | "FROZEN_AT" | "LOGGED_BY";
export type FreezeSnapshotStatus = "FROZEN" | "THAWED" | "DRAFT";
//# sourceMappingURL=governance-memory-types.d.ts.map