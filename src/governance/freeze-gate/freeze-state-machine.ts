/** ============================================================
 *  Freeze State Machine — Controls architecture freeze lifecycle.
 *
 *  States:
 *    DRAFT → UNDER_REVIEW → ARBITRATION → FROZEN → THAWED
 *              ↓                            ↑
 *          CHANGES_REQUIRED → DRAFT        (re-freeze via DRAFT)
 *
 *  No implementation may proceed before FROZEN state.
 *  ============================================================ */

import type {
  FreezeState,
  FreezeTransition,
  FreezeGateEntry,
  FreezeEvent,
} from "./types.js";

const VALID_TRANSITIONS: Record<FreezeState, FreezeTransition[]> = {
  DRAFT: ["SUBMIT_FOR_REVIEW"],
  UNDER_REVIEW: ["REQUEST_CHANGES", "SEND_TO_ARBITRATION"],
  CHANGES_REQUIRED: ["RETURN_TO_DRAFT"],
  ARBITRATION: ["APPROVE", "REQUEST_CHANGES"],
  FROZEN: ["THAW"],
  THAWED: ["RETURN_TO_DRAFT"],
};

function nextState(current: FreezeState, transition: FreezeTransition): FreezeState {
  const flow: [FreezeState, FreezeTransition, FreezeState][] = [
    ["DRAFT", "SUBMIT_FOR_REVIEW", "UNDER_REVIEW"],
    ["UNDER_REVIEW", "REQUEST_CHANGES", "CHANGES_REQUIRED"],
    ["UNDER_REVIEW", "SEND_TO_ARBITRATION", "ARBITRATION"],
    ["CHANGES_REQUIRED", "RETURN_TO_DRAFT", "DRAFT"],
    ["ARBITRATION", "APPROVE", "FROZEN"],
    ["ARBITRATION", "REQUEST_CHANGES", "CHANGES_REQUIRED"],
    ["FROZEN", "THAW", "THAWED"],
    ["THAWED", "RETURN_TO_DRAFT", "DRAFT"],
  ];

  const match = flow.find(([s, t]) => s === current && t === transition);
  return match?.[2] ?? current;
}

export function createFreezeEntry(adrId: string, actor: string): FreezeGateEntry {
  const event: FreezeEvent = {
    from: "DRAFT",
    to: "DRAFT",
    transition: "SUBMIT_FOR_REVIEW",
    actor,
    timestamp: new Date().toISOString(),
    reason: "Freeze entry created",
  };

  return {
    id: `FRZ-${adrId}`,
    adrId,
    state: "DRAFT",
    transitions: VALID_TRANSITIONS.DRAFT,
    moduleBoundaries: [],
    interfaces: [],
    invariants: [],
    acceptanceCriteria: [],
    history: [event],
  };
}

export function transitionFreeze(
  entry: FreezeGateEntry,
  transition: FreezeTransition,
  actor: string,
  reason: string,
  evidence?: string,
): FreezeGateEntry {
  const allowed = VALID_TRANSITIONS[entry.state];
  if (!allowed.includes(transition)) {
    throw new Error(
      `Invalid transition "${transition}" from state "${entry.state}". ` +
      `Allowed: ${allowed.join(", ")}`,
    );
  }

  const to = nextState(entry.state, transition);
  const event: FreezeEvent = {
    from: entry.state,
    to,
    transition,
    actor,
    timestamp: new Date().toISOString(),
    reason,
    evidence,
  };

  return {
    ...entry,
    state: to,
    transitions: VALID_TRANSITIONS[to],
    frozenAt: to === "FROZEN" ? new Date().toISOString() : entry.frozenAt,
    thawedAt: to === "THAWED" ? new Date().toISOString() : entry.thawedAt,
    thawReason: to === "THAWED" ? reason : entry.thawReason,
    history: [...entry.history, event],
  };
}

export type { FreezeGateEntry, FreezeState, FreezeTransition, FreezeEvent } from "./types.js";

export function getFreezeStatus(entry: FreezeGateEntry): {
  isFrozen: boolean;
  canImplement: boolean;
  blockingReason?: string;
} {
  if (entry.state === "FROZEN") {
    return { isFrozen: true, canImplement: true };
  }
  if (entry.state === "THAWED") {
    return {
      isFrozen: false,
      canImplement: false,
      blockingReason: `Architecture was thawed: ${entry.thawReason}`,
    };
  }
  return {
    isFrozen: false,
    canImplement: false,
    blockingReason: `Architecture is in state "${entry.state}". Must reach FROZEN before implementation.`,
  };
}
