/** ============================================================
 *  Freeze Validator — Checks freeze conditions against ADR.
 *
 *  Verifies that module boundaries, interfaces, invariants,
 *  and acceptance criteria are fully defined before freeze.
 *  ============================================================ */
import type { FreezeValidatorInput } from "./types.js";
export interface FreezeValidationResult {
    passed: boolean;
    checks: FreezeCheckResult[];
}
export interface FreezeCheckResult {
    name: string;
    passed: boolean;
    required: boolean;
    detail: string;
}
export declare function validateFreezeConditions(input: FreezeValidatorInput): FreezeValidationResult;
//# sourceMappingURL=freeze-validator.d.ts.map