/**
 * Drift Replay — Governance drift detection and historical decision replay.
 *
 * Provides 6 replay functions that check proposals against historical
 * governance records, invariant registries, and routing protocols.
 *
 * ============================================================
 *  P3.0 Architecture Memory & Governance Persistence
 * ============================================================ */
import type { CognitiveAdrJson } from "./adr-types.js";
import type { InvariantEntry, ViolationReport } from "./invariant-registry.js";
import type { GovernanceMemoryEntry, FreezeSnapshot } from "./governance-memory.js";
import type { RoutingDecisionLog } from "../review/review-types.js";
export interface DecisionReplayResult {
    adr: CognitiveAdrJson;
    governanceEntries: GovernanceMemoryEntry[];
    touchedInvariants: InvariantEntry[];
    freezeSnapshot: FreezeSnapshot | null;
    supersededBy: DecisionReplayResult | null;
    supersedes: DecisionReplayResult | null;
}
export interface FreezeLineageTransition {
    from: string;
    to: string;
    timestamp: string;
    actor: string;
    reason: string;
}
export interface FreezeLineageResult {
    adrId: string;
    freezeVersion: string;
    transitions: FreezeLineageTransition[];
    finalStatus: "FROZEN" | "THAWED" | "DRAFT";
    thawRecord?: {
        reason: string;
        thawedBy: string;
        timestamp: string;
    };
}
export interface DriftWarning {
    type: string;
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    description: string;
    detail: string;
}
export interface DriftReplayDeps {
    getADRById: (id: string) => CognitiveAdrJson | undefined;
    getRelatedADRs: (adrId: string) => CognitiveAdrJson[];
    getEntriesByADRId: (adrId: string) => GovernanceMemoryEntry[];
    getFreezeSnapshotsByADRId: (adrId: string) => FreezeSnapshot[];
    getTouchedInvariants: (invariantIds: string[]) => InvariantEntry[];
    getInvariantById: (id: string) => InvariantEntry | undefined;
    checkInvariantViolation: (adrId: string, invariantIds: string[]) => ViolationReport;
}
/**
 * Replay a governance decision by ADR ID. Recursively resolves
 * supersede chains.
 */
export declare function replayGovernanceDecision(adrId: string, deps: DriftReplayDeps): DecisionReplayResult | null;
/**
 * Replay freeze lineage for an ADR. Traces all transitions
 * and final freeze/thaw status.
 */
export declare function replayFreezeLineage(adrId: string, deps: DriftReplayDeps): FreezeLineageResult;
/**
 * Detect historical invariant violations for a proposal.
 * Checks against all 8 default invariants.
 */
export declare function detectHistoricalInvariantViolation(adrId: string, proposedInvariants: string[], deps: DriftReplayDeps): ViolationReport;
/**
 * Detect authority drift in a governance memory entry.
 * Checks arbitration ownership and reviewer model authority.
 */
export declare function detectAuthorityDrift(entry: GovernanceMemoryEntry): DriftWarning[];
/**
 * Detect routing drift from a RoutingDecisionLog entry.
 */
export declare function detectRoutingDrift(logEntry: RoutingDecisionLog): DriftWarning[];
/**
 * Detect governance/runtime boundary leakage.
 * Checks for cross-boundary contamination between governance
 * and runtime layers.
 */
export declare function detectGovernanceRuntimeLeakage(entry: GovernanceMemoryEntry): DriftWarning[];
//# sourceMappingURL=drift-replay.d.ts.map