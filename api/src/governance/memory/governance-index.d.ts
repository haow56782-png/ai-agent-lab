/**
 * Governance Index — Governance relationship graph and lineage queries.
 *
 * Builds and queries the governance relationship chain:
 * Decision → ADR → Freeze Version → Invariant → ReviewAuditLog
 *   → RoutingDecisionLog → Arbitration Result
 *
 * ============================================================
 *  P3.0 Architecture Memory & Governance Persistence
 * ============================================================ */
import type { CognitiveAdrJson } from "./adr-types.js";
import type { InvariantEntry } from "./invariant-registry.js";
import type { GovernanceMemoryEntry, FreezeSnapshot } from "./governance-memory.js";
import type { GovernanceNodeType, GovernanceEdgeRelationship } from "./governance-memory-types.js";
export interface GovernanceGraphNode {
    id: string;
    type: GovernanceNodeType;
    label: string;
}
export interface GovernanceGraphEdge {
    source: string;
    target: string;
    relationship: GovernanceEdgeRelationship;
}
export interface GovernanceGraph {
    nodes: GovernanceGraphNode[];
    edges: GovernanceGraphEdge[];
}
export interface DecisionLineageEntry {
    adrId: string;
    status: string;
    freezeVersion: string;
    timestamp: string;
    summary: string;
}
export interface DecisionLineageResult {
    rootAdrId: string;
    lineage: DecisionLineageEntry[];
    currentState: {
        activeAdrId: string;
        activeStatus: string;
    };
}
export interface GovernanceLineageResult {
    adrId: string;
    freezeVersion: string;
    invariants: string[];
    relatedMemoryEntries: string[];
}
export interface GovernanceIndexDeps {
    getADRById: (id: string) => CognitiveAdrJson | undefined;
    listADRs: () => CognitiveAdrJson[];
    getRelatedADRs: (adrId: string) => CognitiveAdrJson[];
    getEntriesByADRId: (adrId: string) => GovernanceMemoryEntry[];
    getFreezeSnapshotsByADRId: (adrId: string) => FreezeSnapshot[];
    getTouchedInvariants: (invariantIds: string[]) => InvariantEntry[];
    governanceEntryExists: (entryId: string) => boolean;
}
export declare class GovernanceIndex {
    private deps;
    constructor(deps: GovernanceIndexDeps);
    /**
     * Build the full governance graph for an ADR.
     * Relationship chain:
     * Decision → ADR → Freeze Version → Invariant
     *   → ReviewAuditLog → RoutingDecisionLog → Arbitration Result
     */
    buildGovernanceGraph(adrId: string): GovernanceGraph;
    /**
     * Get the full decision lineage for an ADR, tracing supersede chains.
     */
    getDecisionLineage(adrId: string): DecisionLineageResult;
    /**
     * Get ADR lineage — all ADRs related to the given one via SUPERSEDES/RELATED.
     */
    getADRLineage(adrId: string): CognitiveAdrJson[];
    /**
     * Get invariant lineage for an ADR — all invariants touched
     * across the entire ADR lineage.
     */
    getInvariantLineage(adrId: string): InvariantEntry[];
    /**
     * Get freeze lineage for an ADR — all freeze snapshots
     * across the entire ADR lineage.
     */
    getFreezeLineage(adrId: string): FreezeSnapshot[];
    /**
     * Find related governance memory entries across the ADR lineage.
     */
    findRelatedGovernanceMemory(adrId: string): GovernanceMemoryEntry[];
    /**
     * Build a summary of all governance artifacts for an ADR.
     */
    buildGovernanceIndex(adrId: string): {
        adr: CognitiveAdrJson | undefined;
        lineage: CognitiveAdrJson[];
        invariants: InvariantEntry[];
        freezeSnapshots: FreezeSnapshot[];
        memoryEntries: GovernanceMemoryEntry[];
        graph: GovernanceGraph;
    };
}
//# sourceMappingURL=governance-index.d.ts.map