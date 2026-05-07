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

export type FreezeState =
  | "DRAFT"
  | "UNDER_REVIEW"
  | "CHANGES_REQUIRED"
  | "ARBITRATION"
  | "FROZEN"
  | "THAWED";

export type FreezeTransition =
  | "SUBMIT_FOR_REVIEW"
  | "APPROVE"
  | "REQUEST_CHANGES"
  | "SEND_TO_ARBITRATION"
  | "RETURN_TO_DRAFT"
  | "THAW"
  | "RE_FREEZE";

export const FREEZE_TRANSITIONS: Record<FreezeState, FreezeTransition[]> = {
  DRAFT: ["SUBMIT_FOR_REVIEW"],
  UNDER_REVIEW: ["REQUEST_CHANGES", "SEND_TO_ARBITRATION"],
  CHANGES_REQUIRED: ["RETURN_TO_DRAFT"],
  ARBITRATION: ["APPROVE", "REQUEST_CHANGES"],
  FROZEN: ["THAW"],
  THAWED: ["RETURN_TO_DRAFT"],
};

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

// Import the ADR type without circular dependency
export type ArchitectureDecisionRecordImport = {
  metadata: { id: string; title: string; status: string };
  context: string;
  decision: string;
  moduleBoundaries: string[];
  interfaces: string[];
  invariants: string[];
  acceptanceCriteria: string[];
};
