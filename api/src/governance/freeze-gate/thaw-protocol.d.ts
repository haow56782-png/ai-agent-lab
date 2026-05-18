/** ============================================================
 *  Thaw Protocol — Controlled architecture freeze release.
 *
 *  Thawing requires recorded reason and creates a new DRAFT
 *  cycle. The frozen state is preserved in history.
 *  ============================================================ */
import type { FreezeGateEntry } from "./types.js";
export interface ThawRequest {
    reason: string;
    actor: string;
    evidence?: string;
    affectedInterfaces: string[];
    plannedChanges: string[];
    riskAssessment: "low" | "medium" | "high";
    requiresReFreeze: boolean;
}
export interface ThawResult {
    previousFrozen: FreezeGateEntry;
    thawedEntry: FreezeGateEntry;
    thawRequest: ThawRequest;
    timestamp: string;
}
export declare function initiateThaw(entry: FreezeGateEntry, request: ThawRequest): ThawResult;
export declare function canThawWithoutReview(request: ThawRequest): boolean;
export declare function generateThawReport(result: ThawResult): string;
//# sourceMappingURL=thaw-protocol.d.ts.map