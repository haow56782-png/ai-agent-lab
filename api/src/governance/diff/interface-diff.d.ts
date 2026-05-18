/** ============================================================
 *  Interface Diff — Compares expected vs actual interfaces
 *  to detect architectural drift during implementation.
 *  ============================================================ */
import type { InterfaceDiffResult } from "./diff-types.js";
export interface ExpectedInterface {
    name: string;
    exports: string[];
    methods: string[];
}
export interface ActualInterface {
    name: string;
    exports: string[];
    methods: string[];
}
/**
 * Compare expected (frozen) interfaces against actual (implemented) interfaces.
 */
export declare function diffInterfaces(moduleName: string, expected: ExpectedInterface[], actual: ActualInterface[]): InterfaceDiffResult;
/**
 * Merge multiple InterfaceDiffResults into a single report.
 */
export declare function mergeInterfaceReports(reports: InterfaceDiffResult[]): {
    passed: boolean;
    totalBreaking: number;
    totalChanges: number;
    reports: InterfaceDiffResult[];
};
//# sourceMappingURL=interface-diff.d.ts.map