# Governance Memory

**Version:** 1.0.0
**Status:** IMPLEMENTED (P3.0)
**Last Updated:** 2026-05-07

---

## 1. Overview

Governance Memory is the long-term persistence layer for architecture governance decisions. It is not a log system, not a general memory store, and not a review history dump.

**Purpose:** Enable the system to persistently store and replay:

- Why an architecture decision was made
- Which alternatives were rejected and why
- Which system invariants were touched
- Who holds final arbitration authority
- Which freeze version accepted the decision
- What future constraints limit evolution
- Under what conditions reversal/thaw is permitted
- Whether a new proposal violates historical governance memory

## 2. Architecture

```
┌──────────────────────────────────────────────────────────┐
│                 Governance Memory Layer                    │
├──────────────────────────────────────────────────────────┤
│  GovernanceMemoryStore    │    InMemoryAdrStore           │
│  (append-only entries)    │    (ADR persistence)          │
├───────────────────────────┴──────────────────────────────┤
│  InvariantRegistry         │    DriftReplay               │
│  (INV-001 ~ INV-008)       │    (historical checks)       │
├───────────────────────────┴──────────────────────────────┤
│  GovernanceIndex                                         │
│  (graph relationships, lineage queries)                   │
├──────────────────────────────────────────────────────────┤
│  External Review Policy    │    Audit Log                 │
│  (P2.3 trigger matrix)     │    (routing decisions)       │
└──────────────────────────────────────────────────────────┘
```

## 3. Core Components

### 3.1 GovernanceMemoryStore (`src/governance/memory/governance-memory.ts`)

Central store for governance memory entries and freeze snapshots.

- **Entries:** Append-only log of governance events
- **Freeze Snapshots:** Immutable records of freeze states
- **Proposal Validation:** Checks new proposals against governance rules

### 3.2 InMemoryAdrStore (`src/governance/memory/adr-store.ts`)

Cognitive ADR (Architecture Decision Record) persistence.

- **Create/Append:** No silent overwrite of accepted ADRs
- **Supersede:** Reversal creates a new ADR, linking back to the original
- **Validate:** Checks required fields, constitutional requirements

### 3.3 InvariantRegistry (`src/governance/memory/invariant-registry.ts`)

Registry of constitutional and governance invariants.

- **Default Invariants:** INV-001 through INV-008
- **Violation Checking:** Checks proposals against registered invariants
- **Category/Severity:** Classifies invariants by type and severity

### 3.4 DriftReplay (`src/governance/memory/drift-replay.ts`)

Historical decision replay and drift detection.

- **`replayGovernanceDecision()`** — Full decision replay with supersede chain
- **`replayFreezeLineage()`** — Freeze transition history
- **`detectHistoricalInvariantViolation()`** — Invariant compliance check
- **`detectAuthorityDrift()`** — Authority boundary checks
- **`detectRoutingDrift()`** — Routing protocol checks
- **`detectGovernanceRuntimeLeakage()`** — Cross-boundary leakage checks

### 3.5 GovernanceIndex (`src/governance/memory/governance-index.ts`)

Relationship graph and lineage queries.

- **`buildGovernanceGraph()`** — Full relationship graph for an ADR
- **`getDecisionLineage()`** — Decision history across supersede chains
- **`getADRLineage()`** — All related ADRs in a lineage
- **`getInvariantLineage()`** — All invariants touched across ADR lineage
- **`getFreezeLineage()`** — All freeze snapshots across ADR lineage
- **`findRelatedGovernanceMemory()`** — All governance memory entries in lineage

## 4. Relationship Chain

```
Decision
  → ADR (Cognitive Architecture Decision Record)
    → Freeze Version (snapshot at time of freeze)
      → Invariant (system invariants touched)
    → ReviewAuditLog (review session records)
      → RoutingDecisionLog (model selection decisions)
    → Arbitration Result (Claude Opus arbitration outcome)
```

## 5. Governance Rules

| Rule | Description | Enforcement |
|------|-------------|-------------|
| G1 | Governance history is append-only | Store rejects overwrite/delete |
| G2 | Freeze snapshots are immutable | Status tracked via additional fields |
| G3 | Accepted ADR cannot be silently overwritten | Must create new ADR + SUPERSEDES link |
| G4 | Reversal creates new ADR | `supersedeADR()` instead of mutation |
| G5 | Decision hash is deterministic | FNV-1a hash of canonical fields |

## 6. Default Invariants

| ID | Invariant | Severity |
|----|-----------|----------|
| INV-001 | Opus owns final arbitration | CONSTITUTIONAL |
| INV-002 | External reviewer cannot finalize freeze | CONSTITUTIONAL |
| INV-003 | Governance layer cannot access secrets | SECURITY |
| INV-004 | Runtime cannot mutate constitution | CONSTITUTIONAL |
| INV-005 | Freeze Gate required for constitutional changes | CONSTITUTIONAL |
| INV-006 | Reviewer model cannot self-authorize escalation | GOVERNANCE |
| INV-007 | Mini models cannot act as final Freeze Gate reviewer | GOVERNANCE |
| INV-008 | External reviewer is cognition injection, not routing authority | ARCHITECTURE |

## 7. Non-Negotiable Rules

| # | Rule | Severity |
|---|------|----------|
| R1 | No hardcoded API keys in governance source | CRITICAL |
| R2 | Governance layer must never read secrets | CRITICAL |
| R3 | External reviewer cannot finalize freeze | CRITICAL |
| R4 | Mini model cannot be final Freeze Gate reviewer | CRITICAL |
| R5 | Runtime cannot mutate constitution | CRITICAL |
| R6 | Accepted ADR cannot be mutated | HIGH |
| R7 | Frozen snapshot cannot be mutated | HIGH |
| R8 | Governance bypass is prohibited | CRITICAL |
| R9 | Constitutional changes require L3 Freeze Gate | CRITICAL |
| R10 | Opus arbitration ownership cannot be reduced without L3 Freeze Gate | CRITICAL |

## 8. Integration

### 8.1 Full Governance Index Query

```typescript
const index = new GovernanceIndex(deps);
const fullIndex = index.buildGovernanceIndex("ADR-0001");
// Returns: ADR, lineage, invariants, freeze snapshots, memory entries, graph
```

### 8.2 Decision Replay

```typescript
const result = replayGovernanceDecision("ADR-0001", deps);
// Recursively resolves supersede chain
```

### 8.3 Proposal Validation

```typescript
const result = memoryStore.validateGovernanceProposal(
  "ADR-0005",
  "decision content",
  ReviewLevel.L3,
  "claude-opus",
  ["INV-001", "INV-005"],
  ["gpt-5.5-pro", "claude-opus"],
);
// Checks: Opus arbitration, external reviewer freeze, mini model, constitutional
```

## 9. Related Documents

- [ADR Template](./adr/ADR-0001-template.md) — Template for new ADRs
- [ADR README](./adr/README.md) — ADR directory guide
- [External Review Policy](./external-review-policy.md) — L0-L3 trigger matrix
- [Architecture Freeze Gate](./architecture-freeze-gate.md) — Freeze state machine
- [Model Routing Protocol](./model-routing-protocol.md) — Routing chain
