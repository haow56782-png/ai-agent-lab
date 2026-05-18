/** ============================================================
 *  Schema Diff — Compares expected vs actual type schemas
 *  to detect type-level drift.
 *  ============================================================ */
/**
 * Compare frozen schema against implemented schema.
 */
export function diffSchemas(schemaName, expected, actual) {
    const entries = [];
    const expectedMap = new Map(expected.map((e) => [e.name, e]));
    const actualMap = new Map(actual.map((a) => [a.name, a]));
    for (const exp of expected) {
        const act = actualMap.get(exp.name);
        if (!act) {
            entries.push({
                category: "type_removed",
                severity: "breaking",
                path: exp.name,
                expected: "present",
                actual: "missing",
                description: `Expected type "${exp.name}" not found`,
            });
            continue;
        }
        // Check fields
        for (const ef of exp.fields) {
            const af = act.fields.find((f) => f.name === ef.name);
            if (!af) {
                const severity = ef.required ? "high" : "low";
                entries.push({
                    category: "type_changed",
                    severity: severity,
                    path: `${exp.name}.${ef.name}`,
                    expected: ef.type,
                    actual: "missing",
                    description: `Expected field "${ef.name}" (${ef.type}) not found`,
                });
                continue;
            }
            if (af.type !== ef.type) {
                entries.push({
                    category: "type_changed",
                    severity: ef.required ? "breaking" : "medium",
                    path: `${exp.name}.${ef.name}`,
                    expected: ef.type,
                    actual: af.type,
                    description: `Type mismatch for "${ef.name}": expected ${ef.type}, got ${af.type}`,
                });
            }
            if (af.required !== ef.required) {
                entries.push({
                    category: "type_changed",
                    severity: "medium",
                    path: `${exp.name}.${ef.name}`,
                    expected: ef.required ? "required" : "optional",
                    actual: af.required ? "required" : "optional",
                    description: `Required status changed for "${ef.name}"`,
                });
            }
        }
        // Detect unexpected fields
        for (const af of act.fields) {
            if (!exp.fields.find((f) => f.name === af.name)) {
                entries.push({
                    category: "type_added",
                    severity: "low",
                    path: `${exp.name}.${af.name}`,
                    expected: "not in freeze",
                    actual: af.type,
                    description: `Unexpected field "${af.name}" not in frozen schema`,
                });
            }
        }
    }
    const breakingCount = entries.filter((e) => e.severity === "breaking").length;
    return {
        schemaName,
        entries,
        breakingCount,
        totalChanges: entries.length,
        passed: breakingCount === 0,
    };
}
//# sourceMappingURL=schema-diff.js.map