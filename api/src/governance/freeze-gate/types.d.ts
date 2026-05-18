/** ============================================================
 *  Freeze Gate Types — Architecture Freeze State Machine
 *
 *  State machine controlling the architecture freeze lifecycle.
 *  No implementation may proceed before FROZEN state.
 *
 *  States:
 *    DRAFT → UNDER_REVIEW → ARBITRATION → FROZEN → THAWED
 *              ↓                            ↑
 *          CHANGES_REQUIRED → DRAFT        (re-freeze via DRAFT)
 *  ============================================================ */
export type FreezeState = "DRAFT" | "UNDER_REVIEW" | "CHANGES_REQUIRED" | "ARBITRATION" | "FROZEN" | "THAWED";
export type FreezeTransition = "SUBMIT_FOR_REVIEW" | "APPROVE" | "REQUEST_CHANGES" | "SEND_TO_ARBITRATION" | "RETURN_TO_DRAFT" | "THAW" | "RE_FREEZE";
export declare const FREEZE_TRANSITIONS: Record<FreezeState, FreezeTransition[]>;
export interface FreezeGateEntry {
    id: string;
    adrId: string;
    state: FreezeState;
    transitions: FreezeTransition[];
    moduleBoundaries: string[];
    interfaces: string[];
    invariants: string[];
    acceptanceCriteria: string[];
    frozenAt?: string;
    thawedAt?: string;
    thawReason?: string;
    history: FreezeEvent[];
}
export interface FreezeEvent {
    from: FreezeState;
    to: FreezeState;
    transition: FreezeTransition;
    actor: string;
    timestamp: string;
    reason: string;
    evidence?: string;
}
export interface FreezeValidatorInput {
    adr: ArchitectureDecisionRecordImport;
    moduleBoundaries: string[];
    interfaces: string[];
    invariants: string[];
    acceptanceCriteria: string[];
}
export type ArchitectureDecisionRecordImport = {
    metadata: {
        id: string;
        title: string;
        status: string;
    };
    context: string;
    decision: string;
    moduleBoundaries: string[];
    interfaces: string[];
    invariants: string[];
    acceptanceCriteria: string[];
};
//# sourceMappingURL=types.d.ts.map