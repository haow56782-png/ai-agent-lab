/**
 * Invariant Registry — System invariant definitions and validation.
 *
 * Defines 8 default invariants (INV-001 ~ INV-008) that form the
 * constitutional foundation of the governance system. Supports
 * registration of new invariants and violation checking.
 *
 * ============================================================
 *  P3.0 Architecture Memory & Governance Persistence
 * ============================================================ */
/* ── Default Invariants ─────────────────────────────────── */
const DEFAULT_INVARIANTS = [
    {
        id: "INV-001",
        invariant: "Opus owns final arbitration",
        severity: "CONSTITUTIONAL",
        category: "authority",
        description: "Claude Opus owns final arbitration authority for all architecture decisions. No other model may serve as final arbiter.",
        enacted: "2026-05-07T00:00:00.000Z",
        enactedBy: "P2.0-Governance-Foundation",
        relatedADRs: [],
        immutable: true,
    },
    {
        id: "INV-002",
        invariant: "External reviewer cannot finalize freeze",
        severity: "CONSTITUTIONAL",
        category: "authority",
        description: "External cognitive reviewers (OpenAI, etc.) provide advisory review only. They cannot finalize a freeze decision.",
        enacted: "2026-05-07T00:00:00.000Z",
        enactedBy: "P2.0-Governance-Foundation",
        relatedADRs: [],
        immutable: true,
    },
    {
        id: "INV-003",
        invariant: "Governance layer cannot access secrets",
        severity: "SECURITY",
        category: "security",
        description: "The governance layer (ADR store, freeze gate, review pipeline) must never read, store, or transmit API keys, tokens, or secrets.",
        enacted: "2026-05-07T00:00:00.000Z",
        enactedBy: "P2.0-Governance-Foundation",
        relatedADRs: [],
        immutable: true,
    },
    {
        id: "INV-004",
        invariant: "Runtime cannot mutate constitution",
        severity: "CONSTITUTIONAL",
        category: "boundary",
        description: "The runtime execution layer (DeepSeek, tool execution) cannot modify governance rules, freeze gate state, or constitutional invariants.",
        enacted: "2026-05-07T00:00:00.000Z",
        enactedBy: "P2.0-Governance-Foundation",
        relatedADRs: [],
        immutable: true,
    },
    {
        id: "INV-005",
        invariant: "Freeze Gate required for constitutional changes",
        severity: "CONSTITUTIONAL",
        category: "protocol",
        description: "Any change to a constitutional invariant requires L3 Freeze Gate approval. No bypass is permitted.",
        enacted: "2026-05-07T00:00:00.000Z",
        enactedBy: "P2.0-Governance-Foundation",
        relatedADRs: [],
        immutable: true,
    },
    {
        id: "INV-006",
        invariant: "Reviewer model cannot self-authorize escalation",
        severity: "GOVERNANCE",
        category: "authority",
        description: "An external reviewer model cannot authorize its own governance escalation or grant itself additional authority.",
        enacted: "2026-05-07T00:00:00.000Z",
        enactedBy: "P2.0-Governance-Foundation",
        relatedADRs: [],
        immutable: true,
    },
    {
        id: "INV-007",
        invariant: "Mini models cannot act as final Freeze Gate reviewer",
        severity: "GOVERNANCE",
        category: "authority",
        description: "Models containing 'mini', 'flash', or equivalent lightweight designation cannot serve as the final reviewer in a Freeze Gate pipeline.",
        enacted: "2026-05-07T00:00:00.000Z",
        enactedBy: "P2.0-Governance-Foundation",
        relatedADRs: [],
        immutable: true,
    },
    {
        id: "INV-008",
        invariant: "External reviewer is external cognition injection, not routing authority",
        severity: "ARCHITECTURE",
        category: "boundary",
        description: "External reviewers (OpenAI) are cognition injection for architecture critique only. They do not participate in model routing decisions.",
        enacted: "2026-05-07T00:00:00.000Z",
        enactedBy: "P2.0-Governance-Foundation",
        relatedADRs: [],
        immutable: true,
    },
];
/* ── Registry ───────────────────────────────────────────── */
export class InvariantRegistry {
    invariants;
    constructor(initialInvariants) {
        this.invariants = new Map();
        for (const inv of initialInvariants ?? DEFAULT_INVARIANTS) {
            this.invariants.set(inv.id, { ...inv });
        }
    }
    /* ── Read operations ─────────────────────────────────── */
    getStandardInvariants() {
        return Array.from(this.invariants.values()).map((i) => ({ ...i }));
    }
    getInvariantById(id) {
        const inv = this.invariants.get(id);
        return inv ? { ...inv } : undefined;
    }
    getInvariantsBySeverity(severity) {
        return this.getStandardInvariants().filter((i) => i.severity === severity);
    }
    getConstitutionalInvariants() {
        return this.getInvariantsBySeverity("CONSTITUTIONAL");
    }
    getImmutableInvariants() {
        return this.getStandardInvariants().filter((i) => i.immutable);
    }
    /* ── Mutation ────────────────────────────────────────── */
    registerInvariant(entry) {
        const full = {
            ...entry,
            enacted: entry.enacted ?? new Date().toISOString(),
        };
        this.invariants.set(full.id, { ...full });
        return { ...full };
    }
    /* ── Violation checks ────────────────────────────────── */
    checkInvariantViolation(adrId, invariantIds) {
        const violations = [];
        for (const invId of invariantIds) {
            const inv = this.invariants.get(invId);
            if (!inv)
                continue;
            // INV-001: Opus arbitration — enforced by ensuring no non-Opus arbiter
            if (inv.id === "INV-001") {
                // Check requires external caller to validate arbitration ownership
                violations.push({
                    invariantId: inv.id,
                    invariant: inv.invariant,
                    severity: inv.severity,
                    description: inv.description,
                    detail: `ADR ${adrId} touches INV-001 — must verify arbitration ownership is claude-opus`,
                });
            }
            // INV-002: External reviewer cannot finalize freeze
            if (inv.id === "INV-002") {
                violations.push({
                    invariantId: inv.id,
                    invariant: inv.invariant,
                    severity: inv.severity,
                    description: inv.description,
                    detail: `ADR ${adrId} touches INV-002 — must ensure external reviewer did not finalize freeze`,
                });
            }
            // INV-003: Governance layer cannot access secrets
            if (inv.id === "INV-003") {
                violations.push({
                    invariantId: inv.id,
                    invariant: inv.invariant,
                    severity: inv.severity,
                    description: inv.description,
                    detail: `ADR ${adrId} touches INV-003 — governance layer must not read secrets`,
                });
            }
            // INV-004: Runtime cannot mutate constitution
            if (inv.id === "INV-004") {
                violations.push({
                    invariantId: inv.id,
                    invariant: inv.invariant,
                    severity: inv.severity,
                    description: inv.description,
                    detail: `ADR ${adrId} touches INV-004 — runtime layer must not modify constitution`,
                });
            }
            // INV-005: Freeze Gate required for constitutional changes
            if (inv.id === "INV-005") {
                violations.push({
                    invariantId: inv.id,
                    invariant: inv.invariant,
                    severity: inv.severity,
                    description: inv.description,
                    detail: `ADR ${adrId} touches INV-005 — constitutional change requires L3 Freeze Gate`,
                });
            }
            // INV-006: Reviewer self-authorization
            if (inv.id === "INV-006") {
                violations.push({
                    invariantId: inv.id,
                    invariant: inv.invariant,
                    severity: inv.severity,
                    description: inv.description,
                    detail: `ADR ${adrId} touches INV-006 — reviewer must not self-authorize escalation`,
                });
            }
            // INV-007: Mini model final reviewer
            if (inv.id === "INV-007") {
                violations.push({
                    invariantId: inv.id,
                    invariant: inv.invariant,
                    severity: inv.severity,
                    description: inv.description,
                    detail: `ADR ${adrId} touches INV-007 — mini model cannot be final Freeze Gate reviewer`,
                });
            }
            // INV-008: External reviewer is cognition injection, not routing authority
            if (inv.id === "INV-008") {
                violations.push({
                    invariantId: inv.id,
                    invariant: inv.invariant,
                    severity: inv.severity,
                    description: inv.description,
                    detail: `ADR ${adrId} touches INV-008 — external reviewer is cognition injection, not routing authority`,
                });
            }
        }
        return {
            adrId,
            violations,
            passed: violations.length === 0,
        };
    }
    /* ── Utility ─────────────────────────────────────────── */
    getTouchedInvariants(invariantIds) {
        return invariantIds
            .map((id) => this.invariants.get(id))
            .filter((e) => e !== undefined)
            .map((i) => ({ ...i }));
    }
    size() {
        return this.invariants.size;
    }
}
//# sourceMappingURL=invariant-registry.js.map