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
import type { CognitiveAdrInput, CognitiveAdrJson, AdrStoreEntry, AdrValidationResult } from "./adr-types.js";
export declare class InMemoryAdrStore {
    private entries;
    private nextId;
    private links;
    private reverseLinks;
    /**
     * Create a new ADR from input. Automatically generates ID,
     * computes decision hash, and sets timestamps.
     */
    createADR(input: CognitiveAdrInput): CognitiveAdrJson;
    /**
     * Append an ADR to the store. Append-only: cannot overwrite
     * an existing ADR with the same ID.
     */
    appendADR(adr: CognitiveAdrJson): void;
    getADRById(id: string): CognitiveAdrJson | undefined;
    listADRs(): CognitiveAdrJson[];
    getEntries(): AdrStoreEntry[];
    /**
     * Link two ADRs. A SUPERSEDES link marks the source as SUPERSEDED.
     */
    linkRelatedADR(sourceId: string, targetId: string, relationship: "SUPERSEDES" | "RELATED"): void;
    /**
     * Supersede an existing ADR — creates a reversal with new ADR.
     * The new ADR automatically links as SUPERSEDES the old one.
     */
    supersedeADR(oldAdrId: string, input: CognitiveAdrInput): CognitiveAdrJson;
    validateADR(input: CognitiveAdrInput): AdrValidationResult;
    size(): number;
    clear(): void;
    getRelatedADRs(adrId: string): CognitiveAdrJson[];
    private generateId;
    private computeHash;
    private registerLink;
}
//# sourceMappingURL=adr-store.d.ts.map