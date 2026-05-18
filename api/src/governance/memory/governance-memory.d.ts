/**
 * Governance Memory Store — Central store for governance memory entries
 * and freeze snapshots.
 *
 * Append-only history. Immutable freeze snapshots. Deterministic
 * decision hashes. Supports proposal validation against historical
 * governance memory.
 *
 * ============================================================
 *  P3.0 Architecture Memory & Governance Persistence
 * ============================================================ */
import type { ReviewLevel } from "../review/external-review-policy.js";
import type { DriftRiskLevel, FreezeSnapshotStatus } from "./governance-memory-types.js";
export interface GovernanceMemoryEntry {
    id: string;
    timestamp: string;
    decisionId: string;
    adrId: string;
    reviewLevel: ReviewLevel;
    reviewerModels: string[];
    arbitrationOwner: string;
    freezeVersion: string;
    invariantsTouched: string[];
    decisionHash: string;
    driftRiskLevel: DriftRiskLevel;
    relatedADRIds: string[];
    auditLogIds: string[];
    routingDecisionLogIds: string[];
}
export interface GovernanceMemoryEntryInput {
    decisionId: string;
    adrId: string;
    reviewLevel: ReviewLevel;
    reviewerModels: string[];
    arbitrationOwner: string;
    freezeVersion: string;
    invariantsTouched: string[];
    driftRiskLevel: DriftRiskLevel;
    relatedADRIds?: string[];
    auditLogIds?: string[];
    routingDecisionLogIds?: string[];
}
export interface FreezeSnapshot {
    id: string;
    adrId: string;
    freezeVersion: string;
    status: FreezeSnapshotStatus;
    decisionHash: string;
    frozenAt: string;
    frozenBy: string;
    invariantsCaptured: string[];
    relatedEntryIds: string[];
    thawedAt?: string;
    thawedBy?: string;
    thawReason?: string;
}
export interface FreezeSnapshotInput {
    adrId: string;
    freezeVersion: string;
    frozenBy: string;
    invariantsCaptured: string[];
    relatedEntryIds: string[];
    decisionHash: string;
}
export interface GovernanceProposalCheck {
    adrId: string;
    decisionHash: string;
    checks: Array<{
        rule: string;
        passed: boolean;
        detail: string;
    }>;
    passed: boolean;
}
export declare class GovernanceMemoryStore {
    private entries;
    private freezeSnapshots;
    private nextEntryId;
    private nextSnapshotId;
    /**
     * Create a governance memory entry and append it to history.
     * Computes deterministic decisionHash.
     */
    createGovernanceMemoryEntry(input: GovernanceMemoryEntryInput): GovernanceMemoryEntry;
    /**
     * Append an entry. Append-only: cannot overwrite existing entries.
     */
    appendGovernanceMemoryEntry(entry: GovernanceMemoryEntry): void;
    getGovernanceMemoryEntry(id: string): GovernanceMemoryEntry | undefined;
    listGovernanceMemoryEntries(): GovernanceMemoryEntry[];
    getEntriesByADRId(adrId: string): GovernanceMemoryEntry[];
    getEntryCount(): number;
    /**
     * Create a freeze snapshot. Immutable once created.
     */
    createFreezeSnapshot(input: FreezeSnapshotInput): FreezeSnapshot;
    getFreezeSnapshot(id: string): FreezeSnapshot | undefined;
    listFreezeSnapshots(): FreezeSnapshot[];
    getFreezeSnapshotsByADRId(adrId: string): FreezeSnapshot[];
    /**
     * Mark a freeze snapshot as thawed. The snapshot itself is immutable
     * (status changes are tracked via additional fields, not mutation of
     * original state).
     */
    thawFreezeSnapshot(snapshotId: string, thawedBy: string, reason: string): FreezeSnapshot;
    getFreezeSnapshotCount(): number;
    /**
     * Validate a governance proposal against the memory store.
     * Checks historical governance rules to detect conflicts.
     */
    validateGovernanceProposal(adrId: string, decisionContent: string, reviewLevel: ReviewLevel, arbitrationOwner: string, invariantsTouched: string[], reviewerModels: string[]): GovernanceProposalCheck;
    clear(): void;
}
//# sourceMappingURL=governance-memory.d.ts.map