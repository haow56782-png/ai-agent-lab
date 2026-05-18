/**
 * ADR Store — Cognitive Architecture Decision Record storage.
 *
 * Append-only store with no silent overwrite of accepted ADRs.
 * Reversal creates a new ADR. Constitutional ADRs require reversal
 * conditions. Decision hash is deterministic.
 *
 * ============================================================
 *  P3.0 Architecture Memory & Governance Persistence
 * ============================================================ */
import { computeDecisionHash } from "./governance-memory-utils.js";
/* ── In-Memory ADR Store ────────────────────────────────── */
export class InMemoryAdrStore {
    entries = new Map();
    nextId = 1;
    links = new Map(); // source → targets
    reverseLinks = new Map(); // target → sources
    /* ── Create ──────────────────────────────────────────── */
    /**
     * Create a new ADR from input. Automatically generates ID,
     * computes decision hash, and sets timestamps.
     */
    createADR(input) {
        const validation = this.validateADR(input);
        if (!validation.valid) {
            throw new Error(`ADR validation failed: ${validation.errors.join("; ")}`);
        }
        const id = this.generateId();
        const timestamp = new Date().toISOString();
        const adr = {
            id,
            title: input.title,
            status: "ACCEPTED",
            reviewLevel: input.reviewLevel,
            freezeVersion: input.freezeVersion ?? "",
            timestamp,
            decision: input.decision,
            context: input.context,
            problemStatement: input.problemStatement,
            rationale: input.rationale,
            rejectedAlternatives: [...input.rejectedAlternatives],
            externalReviewerFindings: input.externalReviewerFindings ?? [],
            arbitrationOutcome: input.arbitrationOutcome ?? "",
            driftRisk: input.driftRisk,
            constitutionalImpact: input.constitutionalImpact,
            futureConstraints: input.futureConstraints ?? [],
            reversalConditions: input.reversalConditions ?? [],
            relatedInvariants: input.relatedInvariants ?? [],
            relatedADRs: input.relatedADRs ?? [],
            decisionHash: this.computeHash(input),
        };
        this.appendADR(adr);
        return { ...adr };
    }
    /**
     * Append an ADR to the store. Append-only: cannot overwrite
     * an existing ADR with the same ID.
     */
    appendADR(adr) {
        const existing = this.entries.get(adr.id);
        if (existing) {
            throw new Error(`ADR ${adr.id} already exists — overwrite is not permitted (append-only)`);
        }
        const entry = {
            adr: { ...adr },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        this.entries.set(adr.id, entry);
        // Register related ADR links
        if (adr.relatedADRs) {
            for (const relatedId of adr.relatedADRs) {
                this.registerLink(adr.id, relatedId);
            }
        }
    }
    /* ── Read ────────────────────────────────────────────── */
    getADRById(id) {
        const entry = this.entries.get(id);
        return entry ? { ...entry.adr } : undefined;
    }
    listADRs() {
        return Array.from(this.entries.values()).map((e) => ({ ...e.adr }));
    }
    getEntries() {
        return Array.from(this.entries.values()).map((e) => ({
            ...e,
            adr: { ...e.adr },
        }));
    }
    /* ── Linking ─────────────────────────────────────────── */
    /**
     * Link two ADRs. A SUPERSEDES link marks the source as SUPERSEDED.
     */
    linkRelatedADR(sourceId, targetId, relationship) {
        const source = this.entries.get(sourceId);
        const target = this.entries.get(targetId);
        if (!source) {
            throw new Error(`Source ADR ${sourceId} not found`);
        }
        if (!target) {
            throw new Error(`Target ADR ${targetId} not found`);
        }
        this.registerLink(sourceId, targetId);
        if (relationship === "SUPERSEDES") {
            source.adr.status = "SUPERSEDED";
            source.adr.relatedADRs = [...new Set([...source.adr.relatedADRs, targetId])];
            target.adr.relatedADRs = [...new Set([...target.adr.relatedADRs, sourceId])];
            target.adr.relatedADRs.push(sourceId);
        }
        else {
            source.adr.relatedADRs = [...new Set([...source.adr.relatedADRs, targetId])];
            target.adr.relatedADRs = [...new Set([...target.adr.relatedADRs, sourceId])];
        }
    }
    /**
     * Supersede an existing ADR — creates a reversal with new ADR.
     * The new ADR automatically links as SUPERSEDES the old one.
     */
    supersedeADR(oldAdrId, input) {
        const existing = this.entries.get(oldAdrId);
        if (!existing) {
            throw new Error(`ADR ${oldAdrId} not found — cannot supersede`);
        }
        // Ensure the new input has the old ADR in relatedADRs
        const related = new Set(input.relatedADRs ?? []);
        related.add(oldAdrId);
        input.relatedADRs = Array.from(related);
        // Create new ADR
        const newAdr = this.createADR(input);
        // Link as SUPERSEDES
        this.linkRelatedADR(oldAdrId, newAdr.id, "SUPERSEDES");
        return { ...newAdr };
    }
    /* ── Validation ──────────────────────────────────────── */
    validateADR(input) {
        const errors = [];
        const warnings = [];
        // Required fields
        if (!input.title?.trim())
            errors.push("title is required");
        if (!input.decision?.trim())
            errors.push("decision is required");
        if (!input.context?.trim())
            errors.push("context is required");
        if (!input.problemStatement?.trim())
            errors.push("problemStatement is required");
        if (!input.rationale?.trim())
            errors.push("rationale is required");
        // Rejected alternatives required for all ADRs
        if (!input.rejectedAlternatives || input.rejectedAlternatives.length === 0) {
            errors.push("rejectedAlternatives is required — at least one rejected alternative must be documented");
        }
        // Review level validation
        const validLevels = ["L0", "L1", "L2", "L3"];
        if (!validLevels.includes(input.reviewLevel)) {
            errors.push(`reviewLevel must be one of: ${validLevels.join(", ")}`);
        }
        // Drift risk validation
        const validDrift = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
        if (!validDrift.includes(input.driftRisk)) {
            errors.push(`driftRisk must be one of: ${validDrift.join(", ")}`);
        }
        // Constitutional impact validation
        const validImpacts = [
            "NONE",
            "BOUNDARY",
            "INVARIANT",
            "AUTHORITY",
        ];
        if (!validImpacts.includes(input.constitutionalImpact)) {
            errors.push(`constitutionalImpact must be one of: ${validImpacts.join(", ")}`);
        }
        // Reversal conditions required for constitutional ADRs
        if (input.constitutionalImpact !== "NONE" &&
            (!input.reversalConditions || input.reversalConditions.length === 0)) {
            errors.push("reversalConditions required for constitutional-impact ADRs " +
                `(constitutionalImpact=${input.constitutionalImpact})`);
        }
        return { valid: errors.length === 0, errors, warnings };
    }
    /* ── Utility ─────────────────────────────────────────── */
    size() {
        return this.entries.size;
    }
    clear() {
        this.entries.clear();
        this.nextId = 1;
        this.links.clear();
        this.reverseLinks.clear();
    }
    getRelatedADRs(adrId) {
        const linked = this.links.get(adrId) ?? new Set();
        const result = [];
        for (const id of linked) {
            const entry = this.entries.get(id);
            if (entry)
                result.push({ ...entry.adr });
        }
        return result;
    }
    /* ── Private ─────────────────────────────────────────── */
    generateId() {
        const id = `ADR-${String(this.nextId).padStart(4, "0")}`;
        this.nextId++;
        return id;
    }
    computeHash(input) {
        const touched = (input.relatedInvariants ?? []).slice().sort();
        return computeDecisionHash(`ADR-${String(this.nextId).padStart(4, "0")}`, input.decision, input.context, input.freezeVersion ?? "", touched.join(","));
    }
    registerLink(sourceId, targetId) {
        if (!this.links.has(sourceId)) {
            this.links.set(sourceId, new Set());
        }
        this.links.get(sourceId).add(targetId);
        if (!this.reverseLinks.has(targetId)) {
            this.reverseLinks.set(targetId, new Set());
        }
        this.reverseLinks.get(targetId).add(sourceId);
    }
}
//# sourceMappingURL=adr-store.js.map