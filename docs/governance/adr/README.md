# Architecture Decision Records (ADR)

This directory contains Cognitive Architecture Decision Records (Cognitive ADRs) — the formal documentation of architectural decisions made within the VIB AI Agent Platform governance system.

## ADR Lifecycle

```
DRAFT → ACCEPTED → FROZEN → (future evolution requires THAW)
                  ↘ SUPERSEDED (replaced by newer ADR)
                  ↘ REJECTED (proposal rejected during review)
```

- **DRAFT** — Initial proposal, not yet reviewed
- **ACCEPTED** — Approved by review process, decision stands
- **FROZEN** — Accepted AND locked by freeze gate, immutable
- **SUPERSEDED** — Replaced by a newer ADR that overrides this decision
- **REJECTED** — Rejected during cognitive review or arbitration

## ADR Naming Convention

```
ADR-NNNN-title-with-dashes.md
```

- `NNNN` — Zero-padded sequential number (0001, 0002, ...)
- Title kebab-case, descriptive of the decision

## Directory Structure

```
docs/governance/adr/
├── README.md                  ← This file
├── ADR-0001-template.md       ← Template for new ADRs
└── ADR-NNNN-*.md              ← ADR files (created as decisions are made)
```

## Cognitive ADR Template

Use `ADR-0001-template.md` when creating new ADRs. Every ADR must include:

| Field | Required | Description |
|-------|----------|-------------|
| Title | Yes | Short description of the decision |
| Status | Yes | One of DRAFT, ACCEPTED, SUPERSEDED, REJECTED, FROZEN |
| Review Level | Yes | L0–L3 per External Review Policy |
| Freeze Version | If frozen | Freeze Gate version at time of acceptance |
| Context | Yes | Why this decision was made |
| Problem Statement | Yes | The problem being solved |
| Decision | Yes | The actual architectural decision |
| Rationale | Yes | Why this choice was made |
| Rejected Alternatives | Yes | At least one documented alternative |
| Drift Risk | Yes | LOW/MEDIUM/HIGH/CRITICAL |
| Constitutional Impact | Yes | NONE/BOUNDARY/INVARIANT/AUTHORITY |
| Reversal Conditions | If constitutional | Conditions for reversal/thaw |

## Governance Integration

ADRs are stored in and queried through:

- **`src/governance/memory/adr-store.ts`** — In-memory ADR store
- **`src/governance/memory/governance-memory.ts`** — Governance memory + freeze snapshots
- **`src/governance/memory/drift-replay.ts`** — Historical decision replay
- **`src/governance/memory/governance-index.ts`** — Governance relationship graph

## Related

- [External Review Policy](../external-review-policy.md)
- [Architecture Freeze Gate](../architecture-freeze-gate.md)
- [Model Routing Protocol](../model-routing-protocol.md)
- [Governance Memory](../governance-memory.md)
