/** ============================================================
 *  Interface Diff — Compares expected vs actual interfaces
 *  to detect architectural drift during implementation.
 *  ============================================================ */
/**
 * Compare expected (frozen) interfaces against actual (implemented) interfaces.
 */
export function diffInterfaces(moduleName, expected, actual) {
    const entries = [];
    const expectedMap = new Map(expected.map((e) => [e.name, e]));
    const actualMap = new Map(actual.map((a) => [a.name, a]));
    for (const exp of expected) {
        const act = actualMap.get(exp.name);
        if (!act) {
            entries.push({
                category: "interface_removed",
                severity: "breaking",
                path: exp.name,
                expected: "present",
                actual: "missing",
                description: `Expected interface "${exp.name}" not found in implementation`,
            });
            continue;
        }
        // Check exports
        for (const ex of exp.exports) {
            if (!act.exports.includes(ex)) {
                entries.push({
                    category: "interface_changed",
                    severity: "high",
                    path: `${exp.name}.${ex}`,
                    expected: `export ${ex}`,
                    actual: "missing",
                    description: `Expected export "${ex}" not found in "${exp.name}"`,
                });
            }
        }
        // Check methods
        for (const m of exp.methods) {
            if (!act.methods.includes(m)) {
                entries.push({
                    category: "interface_changed",
                    severity: "high",
                    path: `${exp.name}.${m}()`,
                    expected: `method ${m}`,
                    actual: "missing",
                    description: `Expected method "${m}" not found in "${exp.name}"`,
                });
            }
        }
    }
    // Detect unexpected interfaces
    for (const act of actual) {
        if (!expectedMap.has(act.name)) {
            entries.push({
                category: "interface_added",
                severity: "medium",
                path: act.name,
                expected: "not in freeze",
                actual: "present",
                description: `Unexpected interface "${act.name}" not declared in architecture freeze`,
            });
        }
    }
    const breakingCount = entries.filter((e) => e.severity === "breaking").length;
    return {
        moduleName,
        entries,
        breakingCount,
        totalChanges: entries.length,
        passed: entries.length === 0,
    };
}
/**
 * Merge multiple InterfaceDiffResults into a single report.
 */
export function mergeInterfaceReports(reports) {
    const totalBreaking = reports.reduce((s, r) => s + r.breakingCount, 0);
    const totalChanges = reports.reduce((s, r) => s + r.totalChanges, 0);
    return {
        passed: totalBreaking === 0,
        totalBreaking,
        totalChanges,
        reports,
    };
}
//# sourceMappingURL=interface-diff.js.map