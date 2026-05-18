/** ============================================================
 *  Diff Types — Architecture drift detection types
 *  ============================================================ */
export type DiffSeverity = "none" | "low" | "medium" | "high" | "breaking";
export type DiffCategory = "interface_added" | "interface_removed" | "interface_changed" | "type_added" | "type_removed" | "type_changed" | "invariant_added" | "invariant_removed" | "invariant_violated" | "module_boundary_added" | "module_boundary_removed" | "module_boundary_crossed";
export interface DiffEntry {
    category: DiffCategory;
    severity: DiffSeverity;
    path: string;
    expected: string;
    actual: string;
    description: string;
}
export interface InterfaceDiffResult {
    moduleName: string;
    entries: DiffEntry[];
    breakingCount: number;
    totalChanges: number;
    passed: boolean;
}
export interface SchemaDiffResult {
    schemaName: string;
    entries: DiffEntry[];
    breakingCount: number;
    totalChanges: number;
    passed: boolean;
}
export interface InvariantCheckResult {
    invariant: string;
    passed: boolean;
    actualValue?: string;
    expectedValue?: string;
    description: string;
}
export interface DiffValidationReport {
    moduleBoundaries: InterfaceDiffResult[];
    interfaces: InterfaceDiffResult[];
    invariants: InvariantCheckResult[];
    totalBreaking: number;
    totalWarnings: number;
    passed: boolean;
    validatedAt: string;
}
//# sourceMappingURL=diff-types.d.ts.map