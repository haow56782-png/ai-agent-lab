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
import type { FreezeTransition, FreezeGateEntry } from "./types.js";
export declare function createFreezeEntry(adrId: string, actor: string): FreezeGateEntry;
export declare function transitionFreeze(entry: FreezeGateEntry, transition: FreezeTransition, actor: string, reason: string, evidence?: string): FreezeGateEntry;
export type { FreezeGateEntry, FreezeState, FreezeTransition, FreezeEvent } from "./types.js";
export declare function getFreezeStatus(entry: FreezeGateEntry): {
    isFrozen: boolean;
    canImplement: boolean;
    blockingReason?: string;
};
//# sourceMappingURL=freeze-state-machine.d.ts.map