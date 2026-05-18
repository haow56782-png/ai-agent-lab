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
export const FREEZE_TRANSITIONS = {
    DRAFT: ["SUBMIT_FOR_REVIEW"],
    UNDER_REVIEW: ["REQUEST_CHANGES", "SEND_TO_ARBITRATION"],
    CHANGES_REQUIRED: ["RETURN_TO_DRAFT"],
    ARBITRATION: ["APPROVE", "REQUEST_CHANGES"],
    FROZEN: ["THAW"],
    THAWED: ["RETURN_TO_DRAFT"],
};
//# sourceMappingURL=types.js.map