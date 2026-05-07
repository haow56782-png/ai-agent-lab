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

/* ── Graph Types ────────────────────────────────────────── */

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

/* ── Index Dependencies ─────────────────────────────────── */

export interface GovernanceIndexDeps {
  getADRById: (id: string) => CognitiveAdrJson | undefined;
  listADRs: () => CognitiveAdrJson[];
  getRelatedADRs: (adrId: string) => CognitiveAdrJson[];
  getEntriesByADRId: (adrId: string) => GovernanceMemoryEntry[];
  getFreezeSnapshotsByADRId: (adrId: string) => FreezeSnapshot[];
  getTouchedInvariants: (invariantIds: string[]) => InvariantEntry[];
  governanceEntryExists: (entryId: string) => boolean;
}

/* ── Governance Index ───────────────────────────────────── */

export class GovernanceIndex {
  private deps: GovernanceIndexDeps;

  constructor(deps: GovernanceIndexDeps) {
    this.deps = deps;
  }

  /**
   * Build the full governance graph for an ADR.
   * Relationship chain:
   * Decision → ADR → Freeze Version → Invariant
   *   → ReviewAuditLog → RoutingDecisionLog → Arbitration Result
   */
  buildGovernanceGraph(adrId: string): GovernanceGraph {
    const nodes: GovernanceGraphNode[] = [];
    const edges: GovernanceGraphEdge[] = [];

    const adr = this.deps.getADRById(adrId);
    if (!adr) return { nodes, edges };

    // ADR node
    nodes.push({
      id: adr.id,
      type: "ADR",
      label: `${adr.id}: ${adr.title}`,
    });

    // Related ADRs
    const relatedADRs = this.deps.getRelatedADRs(adrId);
    for (const related of relatedADRs) {
      nodes.push({
        id: related.id,
        type: "ADR",
        label: `${related.id}: ${related.title}`,
      });
      edges.push({
        source: adr.id,
        target: related.id,
        relationship: adr.relatedADRs.includes(related.id)
          ? "RELATED"
          : "RELATED",
      });
    }

    // Freeze snapshots
    const freezeSnapshots = this.deps.getFreezeSnapshotsByADRId(adrId);
    for (const snap of freezeSnapshots) {
      const nodeId = `freeze:${snap.id}`;
      nodes.push({
        id: nodeId,
        type: "FREEZE",
        label: `Freeze ${snap.freezeVersion} (${snap.status})`,
      });
      edges.push({
        source: adr.id,
        target: nodeId,
        relationship: "FROZEN_AT",
      });

      // Invariants captured in this freeze
      for (const invId of snap.invariantsCaptured) {
        const inv = this.deps.getTouchedInvariants([invId]);
        if (inv.length > 0) {
          nodes.push({
            id: `inv:${inv[0].id}`,
            type: "INVARIANT",
            label: `${inv[0].id}: ${inv[0].invariant}`,
          });
          edges.push({
            source: nodeId,
            target: `inv:${inv[0].id}`,
            relationship: "TOUCHES",
          });
        }
      }
    }

    // Governance memory entries
    const entries = this.deps.getEntriesByADRId(adrId);
    for (const entry of entries) {
      const nodeId = `gme:${entry.id}`;
      nodes.push({
        id: nodeId,
        type: "REVIEW",
        label: `Entry ${entry.id} (${entry.reviewLevel})`,
      });
      edges.push({
        source: adr.id,
        target: nodeId,
        relationship: "REVIEWED_BY",
      });
    }

    return { nodes, edges };
  }

  /**
   * Get the full decision lineage for an ADR, tracing supersede chains.
   */
  getDecisionLineage(adrId: string): DecisionLineageResult {
    const lineage: DecisionLineageEntry[] = [];
    const visited = new Set<string>();
    const queue: string[] = [adrId];
    let activeAdrId = adrId;
    let activeStatus = "UNKNOWN";

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const adr = this.deps.getADRById(currentId);
      if (!adr) continue;

      lineage.push({
        adrId: adr.id,
        status: adr.status,
        freezeVersion: adr.freezeVersion,
        timestamp: adr.timestamp,
        summary: adr.title,
      });

      if (adr.status === "ACCEPTED" || adr.status === "FROZEN") {
        activeAdrId = adr.id;
        activeStatus = adr.status;
      }

      // Follow related ADRs for supersede chain
      const related = this.deps.getRelatedADRs(currentId);
      for (const rel of related) {
        if (!visited.has(rel.id)) {
          queue.push(rel.id);
        }
      }
    }

    return {
      rootAdrId: adrId,
      lineage: lineage.sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      ),
      currentState: {
        activeAdrId,
        activeStatus,
      },
    };
  }

  /**
   * Get ADR lineage — all ADRs related to the given one via SUPERSEDES/RELATED.
   */
  getADRLineage(adrId: string): CognitiveAdrJson[] {
    const visited = new Set<string>();
    const result: CognitiveAdrJson[] = [];
    const queue: string[] = [adrId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const adr = this.deps.getADRById(currentId);
      if (!adr) continue;

      result.push(adr);

      const related = this.deps.getRelatedADRs(currentId);
      for (const rel of related) {
        if (!visited.has(rel.id)) {
          queue.push(rel.id);
        }
      }
    }

    return result;
  }

  /**
   * Get invariant lineage for an ADR — all invariants touched
   * across the entire ADR lineage.
   */
  getInvariantLineage(adrId: string): InvariantEntry[] {
    const invariantIds = new Set<string>();
    const adrs = this.getADRLineage(adrId);

    for (const adr of adrs) {
      for (const invId of adr.relatedInvariants) {
        invariantIds.add(invId);
      }
    }

    return this.deps.getTouchedInvariants(Array.from(invariantIds));
  }

  /**
   * Get freeze lineage for an ADR — all freeze snapshots
   * across the entire ADR lineage.
   */
  getFreezeLineage(adrId: string): FreezeSnapshot[] {
    const snapshots: FreezeSnapshot[] = [];
    const adrs = this.getADRLineage(adrId);

    for (const adr of adrs) {
      const adrSnapshots = this.deps.getFreezeSnapshotsByADRId(adr.id);
      snapshots.push(...adrSnapshots);
    }

    return snapshots;
  }

  /**
   * Find related governance memory entries across the ADR lineage.
   */
  findRelatedGovernanceMemory(adrId: string): GovernanceMemoryEntry[] {
    const entries: GovernanceMemoryEntry[] = [];
    const adrs = this.getADRLineage(adrId);

    for (const adr of adrs) {
      const adrEntries = this.deps.getEntriesByADRId(adr.id);
      entries.push(...adrEntries);
    }

    // Deduplicate by entry ID
    const seen = new Set<string>();
    return entries.filter((e) => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });
  }

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
  } {
    const adr = this.deps.getADRById(adrId);

    return {
      adr,
      lineage: this.getADRLineage(adrId),
      invariants: this.getInvariantLineage(adrId),
      freezeSnapshots: this.getFreezeLineage(adrId),
      memoryEntries: this.findRelatedGovernanceMemory(adrId),
      graph: this.buildGovernanceGraph(adrId),
    };
  }
}
