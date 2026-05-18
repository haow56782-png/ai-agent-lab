/** ============================================================
 *  ADR Builder — Construct Architecture Decision Records
 *  from structured input with validation.
 *  ============================================================ */
let _counter = 0;
function generateId() {
    _counter++;
    const ts = Date.now().toString(36).toUpperCase();
    return `ADR-${ts}-${String(_counter).padStart(3, "0")}`;
}
export function buildAdr(params) {
    const id = generateId();
    const now = new Date().toISOString();
    // Validate
    if (!params.title.trim())
        throw new Error("ADR title is required");
    if (!params.context.trim())
        throw new Error("ADR context is required");
    if (!params.decision.trim())
        throw new Error("ADR decision is required");
    if (params.alternatives.length === 0)
        throw new Error("At least one alternative required");
    if (!params.selectedAlternative.trim())
        throw new Error("Selected alternative is required");
    const selectedExists = params.alternatives.some((a) => a.name === params.selectedAlternative);
    if (!selectedExists) {
        throw new Error(`Selected alternative "${params.selectedAlternative}" not found in alternatives list`);
    }
    return {
        metadata: {
            title: params.title,
            id,
            category: params.category,
            status: "draft",
            author: params.author,
            createdAt: now,
            tags: params.tags ?? [],
        },
        context: params.context,
        decision: params.decision,
        rationale: params.rationale,
        alternatives: params.alternatives,
        selectedAlternative: params.selectedAlternative,
        invariants: params.invariants ?? [],
        impacts: params.impacts ?? [],
        moduleBoundaries: params.moduleBoundaries ?? [],
        interfaces: params.interfaces ?? [],
        acceptanceCriteria: params.acceptanceCriteria ?? [],
        supersedes: params.supersedes,
    };
}
export function finalizeAdr(adr) {
    if (adr.metadata.status !== "draft") {
        throw new Error(`Cannot finalize ADR in status "${adr.metadata.status}"`);
    }
    return {
        ...adr,
        metadata: {
            ...adr.metadata,
            status: "final",
            finalizedAt: new Date().toISOString(),
        },
    };
}
export function supersedeAdr(adr, supersededBy) {
    return {
        ...adr,
        metadata: {
            ...adr.metadata,
            status: "superseded",
            supersededBy,
        },
    };
}
//# sourceMappingURL=adr-builder.js.map