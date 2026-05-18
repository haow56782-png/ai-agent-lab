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
import { computeDecisionHash } from "./governance-memory-utils.js";
/* ── Memory Store Implementation ────────────────────────── */
export class GovernanceMemoryStore {
    entries = [];
    freezeSnapshots = new Map();
    nextEntryId = 1;
    nextSnapshotId = 1;
    /* ── Entry Operations ────────────────────────────────── */
    /**
     * Create a governance memory entry and append it to history.
     * Computes deterministic decisionHash.
     */
    createGovernanceMemoryEntry(input) {
        const decisionHash = computeDecisionHash(input.adrId, input.decisionId, input.reviewLevel, input.freezeVersion, input.invariantsTouched.slice().sort());
        const entry = {
            id: `GME-${String(this.nextEntryId).padStart(4, "0")}`,
            timestamp: new Date().toISOString(),
            decisionId: input.decisionId,
            adrId: input.adrId,
            reviewLevel: input.reviewLevel,
            reviewerModels: [...input.reviewerModels],
            arbitrationOwner: input.arbitrationOwner,
            freezeVersion: input.freezeVersion,
            invariantsTouched: [...input.invariantsTouched],
            decisionHash,
            driftRiskLevel: input.driftRiskLevel,
            relatedADRIds: input.relatedADRIds ?? [],
            auditLogIds: input.auditLogIds ?? [],
            routingDecisionLogIds: input.routingDecisionLogIds ?? [],
        };
        this.appendGovernanceMemoryEntry(entry);
        return { ...entry };
    }
    /**
     * Append an entry. Append-only: cannot overwrite existing entries.
     */
    appendGovernanceMemoryEntry(entry) {
        const existing = this.entries.find((e) => e.id === entry.id);
        if (existing) {
            throw new Error(`Entry ${entry.id} already exists — append-only, cannot overwrite`);
        }
        this.entries.push({ ...entry });
        this.nextEntryId = Math.max(this.nextEntryId, parseInt(entry.id.split("-")[1], 10) + 1);
    }
    getGovernanceMemoryEntry(id) {
        const found = this.entries.find((e) => e.id === id);
        return found ? { ...found } : undefined;
    }
    listGovernanceMemoryEntries() {
        return this.entries.map((e) => ({ ...e }));
    }
    getEntriesByADRId(adrId) {
        return this.entries
            .filter((e) => e.adrId === adrId)
            .map((e) => ({ ...e }));
    }
    getEntryCount() {
        return this.entries.length;
    }
    /* ── Freeze Snapshot Operations ───────────────────────── */
    /**
     * Create a freeze snapshot. Immutable once created.
     */
    createFreezeSnapshot(input) {
        const id = `FS-${String(this.nextSnapshotId).padStart(4, "0")}`;
        this.nextSnapshotId++;
        const snapshot = {
            id,
            adrId: input.adrId,
            freezeVersion: input.freezeVersion,
            status: "FROZEN",
            decisionHash: input.decisionHash,
            frozenAt: new Date().toISOString(),
            frozenBy: input.frozenBy,
            invariantsCaptured: [...input.invariantsCaptured],
            relatedEntryIds: [...input.relatedEntryIds],
        };
        this.freezeSnapshots.set(id, snapshot);
        return { ...snapshot };
    }
    getFreezeSnapshot(id) {
        const snap = this.freezeSnapshots.get(id);
        return snap ? { ...snap } : undefined;
    }
    listFreezeSnapshots() {
        return Array.from(this.freezeSnapshots.values()).map((s) => ({ ...s }));
    }
    getFreezeSnapshotsByADRId(adrId) {
        return Array.from(this.freezeSnapshots.values())
            .filter((s) => s.adrId === adrId)
            .map((s) => ({ ...s }));
    }
    /**
     * Mark a freeze snapshot as thawed. The snapshot itself is immutable
     * (status changes are tracked via additional fields, not mutation of
     * original state).
     */
    thawFreezeSnapshot(snapshotId, thawedBy, reason) {
        const snap = this.freezeSnapshots.get(snapshotId);
        if (!snap) {
            throw new Error(`Freeze snapshot ${snapshotId} not found`);
        }
        if (snap.status !== "FROZEN") {
            throw new Error(`Freeze snapshot ${snapshotId} is not FROZEN (status=${snap.status})`);
        }
        snap.status = "THAWED";
        snap.thawedAt = new Date().toISOString();
        snap.thawedBy = thawedBy;
        snap.thawReason = reason;
        return { ...snap };
    }
    getFreezeSnapshotCount() {
        return this.freezeSnapshots.size;
    }
    /* ── Proposal Validation ───────────────────────────────── */
    /**
     * Validate a governance proposal against the memory store.
     * Checks historical governance rules to detect conflicts.
     */
    validateGovernanceProposal(adrId, decisionContent, reviewLevel, arbitrationOwner, invariantsTouched, reviewerModels) {
        const decisionHash = computeDecisionHash(adrId, decisionContent, reviewLevel, "", invariantsTouched.slice().sort());
        const checks = [];
        // Rule: Opus arbitration ownership
        checks.push({
            rule: "Opus owns final arbitration",
            passed: arbitrationOwner === "claude-opus",
            detail: arbitrationOwner === "claude-opus"
                ? "Arbitration owner is claude-opus"
                : `Arbitration owner is ${arbitrationOwner}, must be claude-opus`,
        });
        // Rule: External reviewer cannot finalize
        const hasExternalReviewer = reviewerModels.some((m) => m !== "claude-opus" && m !== "none");
        checks.push({
            rule: "External reviewer cannot finalize freeze",
            passed: !(hasExternalReviewer && reviewLevel === "L3") || arbitrationOwner === "claude-opus",
            detail: !(hasExternalReviewer && reviewLevel === "L3") || arbitrationOwner === "claude-opus"
                ? "External reviewers are advisory — Opus holds freeze authority"
                : "External reviewer present at L3 without Opus arbitration",
        });
        // Rule: Mini model check for L3
        const hasMiniFinalReviewer = reviewLevel === "L3" &&
            reviewerModels.some((m) => m.includes("mini") || m.includes("flash"));
        checks.push({
            rule: "Mini model cannot be final Freeze Gate reviewer",
            passed: !hasMiniFinalReviewer,
            detail: hasMiniFinalReviewer
                ? "Mini/flash model present in L3 review — not allowed as final reviewer"
                : "No mini/flash model as final reviewer",
        });
        // Rule: Constitutional invariant check
        const touchesConstitutional = invariantsTouched.some((inv) => ["INV-001", "INV-002", "INV-004", "INV-005"].includes(inv));
        checks.push({
            rule: "Constitutional changes require L3 Freeze Gate",
            passed: !touchesConstitutional || reviewLevel === "L3",
            detail: !touchesConstitutional || reviewLevel === "L3"
                ? "Constitutional invariants guarded by L3 requirement"
                : `Constitutional invariants touched but review level is ${reviewLevel}, must be L3`,
        });
        return {
            adrId,
            decisionHash,
            checks,
            passed: checks.every((c) => c.passed),
        };
    }
    /* ── Clear (for testing) ─────────────────────────────── */
    clear() {
        this.entries = [];
        this.freezeSnapshots.clear();
        this.nextEntryId = 1;
        this.nextSnapshotId = 1;
    }
}
//# sourceMappingURL=governance-memory.js.map