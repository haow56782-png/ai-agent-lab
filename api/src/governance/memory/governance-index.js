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
/* ── Governance Index ───────────────────────────────────── */
export class GovernanceIndex {
    deps;
    constructor(deps) {
        this.deps = deps;
    }
    /**
     * Build the full governance graph for an ADR.
     * Relationship chain:
     * Decision → ADR → Freeze Version → Invariant
     *   → ReviewAuditLog → RoutingDecisionLog → Arbitration Result
     */
    buildGovernanceGraph(adrId) {
        const nodes = [];
        const edges = [];
        const adr = this.deps.getADRById(adrId);
        if (!adr)
            return { nodes, edges };
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
    getDecisionLineage(adrId) {
        const lineage = [];
        const visited = new Set();
        const queue = [adrId];
        let activeAdrId = adrId;
        let activeStatus = "UNKNOWN";
        while (queue.length > 0) {
            const currentId = queue.shift();
            if (visited.has(currentId))
                continue;
            visited.add(currentId);
            const adr = this.deps.getADRById(currentId);
            if (!adr)
                continue;
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
            lineage: lineage.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
            currentState: {
                activeAdrId,
                activeStatus,
            },
        };
    }
    /**
     * Get ADR lineage — all ADRs related to the given one via SUPERSEDES/RELATED.
     */
    getADRLineage(adrId) {
        const visited = new Set();
        const result = [];
        const queue = [adrId];
        while (queue.length > 0) {
            const currentId = queue.shift();
            if (visited.has(currentId))
                continue;
            visited.add(currentId);
            const adr = this.deps.getADRById(currentId);
            if (!adr)
                continue;
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
    getInvariantLineage(adrId) {
        const invariantIds = new Set();
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
    getFreezeLineage(adrId) {
        const snapshots = [];
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
    findRelatedGovernanceMemory(adrId) {
        const entries = [];
        const adrs = this.getADRLineage(adrId);
        for (const adr of adrs) {
            const adrEntries = this.deps.getEntriesByADRId(adr.id);
            entries.push(...adrEntries);
        }
        // Deduplicate by entry ID
        const seen = new Set();
        return entries.filter((e) => {
            if (seen.has(e.id))
                return false;
            seen.add(e.id);
            return true;
        });
    }
    /**
     * Build a summary of all governance artifacts for an ADR.
     */
    buildGovernanceIndex(adrId) {
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
//# sourceMappingURL=governance-index.js.map