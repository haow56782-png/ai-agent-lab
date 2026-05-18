/**
 * Invariant Registry — System invariant definitions and validation.
 *
 * Defines 8 default invariants (INV-001 ~ INV-008) that form the
 * constitutional foundation of the governance system. Supports
 * registration of new invariants and violation checking.
 *
 * ============================================================
 *  P3.0 Architecture Memory & Governance Persistence
 * ============================================================ */
import type { InvariantSeverity, InvariantCategory } from "./governance-memory-types.js";
export interface InvariantEntry {
    id: string;
    invariant: string;
    severity: InvariantSeverity;
    category: InvariantCategory;
    description: string;
    enacted: string;
    enactedBy: string;
    relatedADRs: string[];
    immutable: boolean;
}
export interface InvariantViolation {
    invariantId: string;
    invariant: string;
    severity: InvariantSeverity;
    description: string;
    detail: string;
}
export interface ViolationReport {
    adrId: string;
    violations: InvariantViolation[];
    passed: boolean;
}
export declare class InvariantRegistry {
    private invariants;
    constructor(initialInvariants?: InvariantEntry[]);
    getStandardInvariants(): InvariantEntry[];
    getInvariantById(id: string): InvariantEntry | undefined;
    getInvariantsBySeverity(severity: InvariantSeverity): InvariantEntry[];
    getConstitutionalInvariants(): InvariantEntry[];
    getImmutableInvariants(): InvariantEntry[];
    registerInvariant(entry: Omit<InvariantEntry, "enacted"> & {
        enacted?: string;
    }): InvariantEntry;
    checkInvariantViolation(adrId: string, invariantIds: string[]): ViolationReport;
    getTouchedInvariants(invariantIds: string[]): InvariantEntry[];
    size(): number;
}
//# sourceMappingURL=invariant-registry.d.ts.map