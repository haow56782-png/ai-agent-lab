/** ============================================================
 *  ADR Builder — Construct Architecture Decision Records
 *  from structured input with validation.
 *  ============================================================ */
import type { ArchitectureDecisionRecord, AdrCategory, AdrAlternative, AdrImpact } from "./types.js";
export interface AdrBuildParams {
    title: string;
    category: AdrCategory;
    author: string;
    context: string;
    decision: string;
    rationale: string;
    alternatives: AdrAlternative[];
    selectedAlternative: string;
    invariants?: string[];
    impacts?: AdrImpact[];
    moduleBoundaries?: string[];
    interfaces?: string[];
    acceptanceCriteria?: string[];
    supersedes?: string;
    tags?: string[];
}
export declare function buildAdr(params: AdrBuildParams): ArchitectureDecisionRecord;
export declare function finalizeAdr(adr: ArchitectureDecisionRecord): ArchitectureDecisionRecord;
export declare function supersedeAdr(adr: ArchitectureDecisionRecord, supersededBy: string): ArchitectureDecisionRecord;
//# sourceMappingURL=adr-builder.d.ts.map