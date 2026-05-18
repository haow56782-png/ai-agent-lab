/** ============================================================
 *  Invariant Check — Validates system invariants against
 *  current system state.
 *  ============================================================ */
import type { InvariantCheckResult } from "./diff-types.js";
export interface InvariantDefinition {
    name: string;
    description: string;
    check: () => boolean | Promise<boolean>;
    expectedValue: string;
}
export interface SystemState {
    testCount: number;
    evalCount: number;
    typecheckPasses: boolean;
    noForbiddenLanguage: boolean;
    frozenModules: string[];
}
/**
 * Pre-defined system invariants.
 */
export declare function checkSystemInvariants(state: SystemState, invariants: InvariantDefinition[]): InvariantCheckResult[];
/**
 * Standard invariants every system should maintain.
 */
export declare function getStandardInvariants(state: SystemState): InvariantDefinition[];
export declare function summarizeInvariantChecks(results: InvariantCheckResult[]): {
    passed: boolean;
    total: number;
    failed: number;
    failures: InvariantCheckResult[];
};
//# sourceMappingURL=invariant-check.d.ts.map