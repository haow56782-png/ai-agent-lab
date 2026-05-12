# Governance Memory Skill

**Version:** 1.0.0
**Status:** PUBLISHED
**Scope:** P3.0 Architecture Memory & Governance Persistence

---

## 1. Skill Name

Governance Memory Skill

## 2. Skill Goal

建立 Cognitive Governance Memory Infrastructure。

它不是日志系统，不是普通 memory，不是 review history dump。

它的目标是让系统能够长期保存并回放：

- 为什么做出某个架构决策
- 当时拒绝了哪些方案
- 哪些系统不变量被触碰
- 谁拥有最终仲裁权
- 哪个 freeze version 接受了该决策
- 哪些 future constraints 会限制后续演化
- 什么条件下允许 reversal / thaw
- 新 proposal 是否违反历史治理记忆

## 3. Skill Applicable Scenarios

当任务涉及以下内容时启用本 Skill：

- Architecture Memory
- Governance Persistence
- Cognitive ADR
- Freeze lineage
- Drift replay
- Invariant registry
- Governance index
- Architecture decision replay
- Long-term governance memory
- Constitutional architecture boundary

## 4. Required Directory Structure

```
src/governance/memory/
├── governance-memory.ts
├── governance-memory-types.ts
├── adr-types.ts
├── adr-store.ts
├── invariant-registry.ts
├── drift-replay.ts
├── governance-index.ts
└── governance-memory-utils.ts

docs/governance/adr/
├── ADR-0001-template.md
└── README.md

docs/governance/governance-memory.md
```

## 5. Cognitive ADR Definition

### 5.1 Cognitive ADR Fields

每个 Cognitive ADR 必须包含以下字段：

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | yes | Unique ADR identifier (e.g. "ADR-0001") |
| `decision` | `string` | yes | The architectural decision made |
| `context` | `string` | yes | What prompted this decision |
| `problemStatement` | `string` | yes | The problem being solved |
| `rationale` | `string` | yes | Why this decision was chosen |
| `rejectedAlternatives` | `string[]` | yes | What was explicitly rejected and why |
| `externalReviewerFindings` | `string[]` | no | Findings from external cognitive review |
| `arbitrationOutcome` | `string` | no | Outcome of Claude Opus arbitration |
| `freezeVersion` | `string` | no | Freeze Gate version that accepted this ADR |
| `driftRisk` | `"LOW" | "MEDIUM" | "HIGH" | "CRITICAL"` | yes | Assessed drift risk |
| `constitutionalImpact` | `"NONE" | "BOUNDARY" | "INVARIANT" | "AUTHORITY"` | yes | Impact on constitutional boundaries |
| `reviewLevel` | `"L0" | "L1" | "L2" | "L3"` | yes | Review level required for this ADR |
| `futureConstraints` | `string[]` | no | Constraints limiting future evolution |
| `reversalConditions` | `string[]` | no | Conditions under which reversal/thaw is allowed |
| `relatedInvariants` | `string[]` | no | System invariants touched by this ADR |
| `relatedADRs` | `string[]` | no | Related or superseded ADR IDs |

### 5.2 ADR Representations

每个 Cognitive ADR 必须支持三种表达形式：

**5.2.1 Markdown Expression**

```markdown
# ADR-0001: [Title]

**Status:** ACCEPTED | SUPERSEDED | REJECTED | FROZEN
**Review Level:** L0 | L1 | L2 | L3
**Freeze Version:** v0.0.0
**Date:** YYYY-MM-DD

## Context
...

## Problem Statement
...

## Decision
...

## Rationale
...

## Rejected Alternatives
- [Alternative A] — rejected because ...
- [Alternative B] — rejected because ...

## External Reviewer Findings
- ...

## Arbitration Outcome
...

## Drift Risk
[LOW | MEDIUM | HIGH | CRITICAL]

## Constitutional Impact
[NONE | BOUNDARY | INVARIANT | AUTHORITY]

## Future Constraints
- ...

## Reversal Conditions
- Reversal requires: ...

## Related Invariants
- INV-001: ...

## Related ADRs
- SUPERSEDES: ADR-0000
- RELATED: ADR-0002
```

**5.2.2 Machine-Readable JSON Expression**

```typescript
interface CognitiveAdrJson {
  id: string;
  title: string;
  status: "ACCEPTED" | "SUPERSEDED" | "REJECTED" | "FROZEN";
  reviewLevel: "L0" | "L1" | "L2" | "L3";
  freezeVersion: string;
  timestamp: string;
  decision: string;
  context: string;
  problemStatement: string;
  rationale: string;
  rejectedAlternatives: string[];
  externalReviewerFindings: string[];
  arbitrationOutcome: string;
  driftRisk: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  constitutionalImpact: "NONE" | "BOUNDARY" | "INVARIANT" | "AUTHORITY";
  futureConstraints: string[];
  reversalConditions: string[];
  relatedInvariants: string[];
  relatedADRs: string[];
  decisionHash: string;
}
```

**5.2.3 Future Replay**

ADR 必须支持通过 `replayGovernanceDecision(adrId)` 回放，回放输出包含：

- 完整的 ADR 内容（markdown + JSON）
- 当时 freeze version 的状态
- 相关不变量列表
- 关联的 audit logs 和 routing decisions
- 如果有被 supersede 的 ADR，递归回放历史

**5.2.4 Governance Graph Relation**

ADR 通过以下关系形成治理图：

```
ADR-0001 (superseded by) → ADR-0002
ADR-0002 (touches) → INV-001, INV-003
ADR-0002 (reviewed by) → ReviewSession-001
ReviewSession-001 (used model) → gpt-5.5
ReviewSession-001 (arbitrated by) → claude-opus
ADR-0002 (frozen at) → Freeze-v1.2.0
ADR-0002 (related) → ADR-0005
```

## 6. GovernanceMemoryEntry

### 6.1 Entry Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique entry identifier |
| `timestamp` | `string` | ISO 8601 timestamp |
| `decisionId` | `string` | Decision identifier |
| `adrId` | `string` | Related ADR identifier |
| `reviewLevel` | `"L0" | "L1" | "L2" | "L3"` | Review level applied |
| `reviewerModels` | `string[]` | Models used in review |
| `arbitrationOwner` | `string` | Entity holding arbitration authority |
| `freezeVersion` | `string` | Freeze Gate version at time of entry |
| `invariantsTouched` | `string[]` | Invariants affected |
| `decisionHash` | `string` | Deterministic hash of decision content |
| `driftRiskLevel` | `"LOW" | "MEDIUM" | "HIGH" | "CRITICAL"` | Assessed drift risk |
| `relatedADRIds` | `string[]` | Related ADR identifiers |
| `auditLogIds` | `string[]` | Audit log entry references |
| `routingDecisionLogIds` | `string[]` | Routing decision log references |

### 6.2 Governance Rules

**Rule G1 — Append-Only History:**
Governance history is append-only. No entry may be deleted, overwritten, or mutated after creation. Corrections require a new entry that references the original entry ID.

**Rule G2 — Immutable Freeze Snapshots:**
Once an ADR reaches FROZEN status, its freezeVersion, decision content, and invariant bindings are immutable. Modification requires a thaw protocol that creates a new freeze lineage.

**Rule G3 — No Silent Overwrite:**
An accepted ADR cannot be silently overwritten. Any change to a previously accepted decision must:
1. Create a new ADR that SUPERSEDES the original
2. Reference the original ADR ID in its `relatedADRs` field
3. Document the reason for supersession in the rationale
4. Pass the same or higher review level as the original ADR

**Rule G4 — Reversal Creates New ADR:**
Reversing a decision is not an undo. It creates a new ADR with:
- A new decision hash
- A clear link to the superseded ADR
- A documented reversal justification
- The same or higher review level requirement

**Rule G5 — Deterministic Decision Hash:**
The `decisionHash` must be deterministically computed from:
- `adrId + decision + context + freezeVersion + invariantsTouched.sort().join(",")`

### 6.3 TypeScript Interface

```typescript
interface GovernanceMemoryEntry {
  id: string;
  timestamp: string;
  decisionId: string;
  adrId: string;
  reviewLevel: ReviewLevel;
  reviewerModels: string[];
  arbitrationOwner: string;
  freezeVersion: string;
  invariantsTouched: string[];
  decisionHash: string;
  driftRiskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  relatedADRIds: string[];
  auditLogIds: string[];
  routingDecisionLogIds: string[];
}
```

## 7. System Invariant Registry

### 7.1 Default Invariants

以下为系统默认不变量，任何修改必须通过 L3 Freeze Gate：

| ID | Invariant | Severity | Description |
|----|-----------|----------|-------------|
| INV-001 | Opus final arbitration | CONSTITUTIONAL | Claude Opus owns final arbitration authority for all architecture decisions. No other model may serve as final arbiter. |
| INV-002 | External reviewer cannot finalize freeze | CONSTITUTIONAL | External cognitive reviewers (OpenAI, etc.) provide advisory review only. They cannot finalize a freeze decision. |
| INV-003 | Governance layer cannot access secrets | SECURITY | The governance layer (ADR store, freeze gate, review pipeline) must never read, store, or transmit API keys, tokens, or secrets. |
| INV-004 | Runtime cannot mutate constitution | CONSTITUTIONAL | The runtime execution layer (DeepSeek, tool execution) cannot modify governance rules, freeze gate state, or constitutional invariants. |
| INV-005 | Freeze Gate required for constitutional changes | CONSTITUTIONAL | Any change to a constitutional invariant requires L3 Freeze Gate approval. No bypass is permitted. |
| INV-006 | Reviewer model cannot self-authorize escalation | GOVERNANCE | An external reviewer model cannot authorize its own governance escalation or grant itself additional authority. |
| INV-007 | Mini models cannot act as final Freeze Gate reviewer | GOVERNANCE | Models containing "mini", "flash", or equivalent lightweight designation cannot serve as the final reviewer in a Freeze Gate pipeline. |
| INV-008 | External reviewer is external cognition injection, not routing authority | ARCHITECTURE | External reviewers (OpenAI) are cognition injection for architecture critique only. They do not participate in model routing decisions. |

### 7.2 Invariant Registry Interface

```typescript
interface InvariantEntry {
  id: string;
  invariant: string;
  severity: "CONSTITUTIONAL" | "SECURITY" | "GOVERNANCE" | "ARCHITECTURE";
  category: "authority" | "security" | "boundary" | "protocol";
  description: string;
  enacted: string;           // ISO timestamp
  enactedBy: string;         // ADR ID that established this invariant
  relatedADRs: string[];
  immutable: boolean;        // true for constitutional invariants
}
```

### 7.3 Registry Operations

- `getStandardInvariants()` — Return all 8 default invariants
- `registerInvariant(entry)` — Register a new invariant
- `checkInvariantViolation(adr, invariants)` — Check ADR against invariant list
- `getTouchedInvariants(adrId)` — Return invariants touched by a given ADR

## 8. Drift Replay

### 8.1 Replay Functions

所有 replay 函数必须从 GovernanceMemoryStore 读取数据，不依赖外部状态。

**8.1.1 `replayGovernanceDecision(adrId: string): DecisionReplayResult`**

回放指定 ADR 的完整决策上下文。输出包括：
- ADR 完整内容
- 相关的所有 GovernanceMemoryEntry 记录
- 相关的所有 invariants 当前状态
- freeze version snapshot
- 如果 ADR 被 supersede，递归回放 superseding ADR

```typescript
interface DecisionReplayResult {
  adr: CognitiveAdrJson;
  governanceEntries: GovernanceMemoryEntry[];
  touchedInvariants: InvariantEntry[];
  freezeSnapshot: FreezeSnapshot | null;
  supersededBy: DecisionReplayResult | null;
  supersedes: DecisionReplayResult | null;
}
```

**8.1.2 `replayFreezeLineage(adrId: string): FreezeLineageResult`**

回放 freeze lineage。输出包括：
- 所有与 ADR 相关的 freeze transitions
- 每个 transition 的 timestamp、actor、reason
- 最终 freeze version
- 如果 freeze 被 thaw，thaw 的原因和 authority

```typescript
interface FreezeLineageResult {
  adrId: string;
  freezeVersion: string;
  transitions: Array<{
    from: string;
    to: string;
    timestamp: string;
    actor: string;
    reason: string;
  }>;
  finalStatus: "FROZEN" | "THAWED" | "DRAFT";
  thawRecord?: {
    reason: string;
    thawedBy: string;
    timestamp: string;
  };
}
```

**8.1.3 `detectHistoricalInvariantViolation(adrId: string): ViolationReport`**

检查 ADR 是否违反任何历史不变量。检查：
- 是否违反 INV-001 (Opus arbitration)
- 是否违反 INV-002 (external reviewer finalize)
- 是否违反 INV-003 (secrets access)
- 是否违反 INV-004 (runtime mutation)
- 是否违反 INV-005 (freeze gate bypass)
- 是否违反 INV-006 (self-authorization)
- 是否违反 INV-007 (mini model final reviewer)
- 是否违反 INV-008 (routing authority)

```typescript
interface ViolationReport {
  adrId: string;
  violations: Array<{
    invariantId: string;
    invariant: string;
    severity: "CONSTITUTIONAL" | "SECURITY" | "GOVERNANCE" | "ARCHITECTURE";
    description: string;
    detail: string;
  }>;
  passed: boolean;
}
```

**8.1.4 `detectAuthorityDrift(entry: GovernanceMemoryEntry): DriftWarning[]`**

检查 authority drift：
- arbitrationOwner 必须是 claude-opus
- reviewLevel L3 必须有 claude-opus 参与
- reviewerModels 不能包含最终仲裁权模型之外的模型作为 final reviewer

**8.1.5 `detectRoutingDrift(entry: GovernanceMemoryEntry): DriftWarning[]`**

检查 routing drift：
- 任何 mini/flash 模型不能出现在 reviewerModels 中（如果 role 是 final reviewer）
- 如果 reviewLevel 是 L3，必须有 claude-opus

**8.1.6 `detectGovernanceRuntimeLeakage(entry: GovernanceMemoryEntry): DriftWarning[]`**

检查 governance/runtime leakage：
- governance layer 不能包含 secret 相关字段
- entry 不能引用 runtime execution context
- freezeVersion 不能由 runtime actor 设置

### 8.2 Replay Check Rules

每个 replay 必须检查以下六项：

| # | Check | Function | Pass Condition |
|---|-------|----------|----------------|
| 1 | Historical ADR violation | `replayGovernanceDecision()` | Proposal does not contradict any accepted ADR |
| 2 | Freeze lineage violation | `replayFreezeLineage()` | Proposal respects freeze lineage ordering |
| 3 | Constitutional invariant | `detectHistoricalInvariantViolation()` | No constitutional invariant is violated |
| 4 | Reviewer authority drift | `detectAuthorityDrift()` | No unauthorized model assumes governance authority |
| 5 | Routing drift | `detectRoutingDrift()` | Routing decisions follow the protocol |
| 6 | Governance/runtime leakage | `detectGovernanceRuntimeLeakage()` | No cross-boundary contamination |

## 9. Governance Index

### 9.1 Relationship Chain

```
Decision
  → ADR
    → Freeze Version
      → Invariant
    → ReviewAuditLog
      → RoutingDecisionLog
    → Arbitration Result
```

### 9.2 Index Operations

**9.2.1 `getRelatedADRs(adrId: string): CognitiveAdrJson[]`**

返回与指定 ADR 相关的所有 ADR（包括 superseded by、supersedes、related）。递归解析 `relatedADRs` 字段。

**9.2.2 `getTouchedInvariants(adrId: string): InvariantEntry[]`**

返回指定 ADR 触碰的所有不变量。通过 `relatedInvariants` 字段查找，并返回每个 invariants 的完整 `InvariantEntry` 对象。

**9.2.3 `getFreezeLineage(adrId: string): FreezeLineageResult`**

返回指定 ADR 的 freeze lineage。委托给 `replayFreezeLineage()`。

**9.2.4 `getDecisionHistory(adrId: string): DecisionHistoryResult`**

返回指定 ADR 的完整决策历史，包括：
- ADR 的所有版本（如果有 supersede）
- 每个版本的 GovernanceMemoryEntry
- 每个版本的 freeze state

```typescript
interface DecisionHistoryResult {
  rootAdrId: string;
  lineage: Array<{
    adrId: string;
    status: string;
    freezeVersion: string;
    timestamp: string;
    summary: string;
  }>;
  currentState: {
    activeAdrId: string;
    activeStatus: string;
  };
}
```

**9.2.5 `getGovernanceGraph(adrId: string): GovernanceGraph`**

返回指定 ADR 的完整治理关系图。

```typescript
interface GovernanceGraph {
  nodes: Array<{
    id: string;
    type: "ADR" | "INVARIANT" | "FREEZE" | "REVIEW" | "ROUTING_DECISION" | "ARBITRATION";
    label: string;
  }>;
  edges: Array<{
    source: string;
    target: string;
    relationship: "SUPERSEDES" | "RELATED" | "TOUCHES" | "REVIEWED_BY" | "ARBITRATED_BY" | "FROZEN_AT" | "LOGGED_BY";
  }>;
}
```

## 10. Non-Negotiable Rules

以下规则不可协商，任何 implementation 必须遵守：

| # | Rule | Violation Severity | Enforcement |
|---|------|-------------------|-------------|
| R1 | No hardcoded API keys in governance source | CRITICAL | Static analysis + code review |
| R2 | Governance layer must never read secrets | CRITICAL | Architectural boundary enforcement |
| R3 | External reviewer cannot finalize freeze | CRITICAL | Runtime check + test assertion |
| R4 | Mini model cannot be final Freeze Gate reviewer | CRITICAL | Runtime check + test assertion |
| R5 | Runtime cannot mutate constitution | CRITICAL | Architectural boundary enforcement |
| R6 | Accepted ADR cannot be mutated | HIGH | Append-only store enforcement |
| R7 | Frozen snapshot cannot be mutated | HIGH | Immutable store enforcement |
| R8 | Governance bypass is prohibited | CRITICAL | Pipeline gate enforcement |
| R9 | Constitutional changes require L3 Freeze Gate | CRITICAL | Review level validation |
| R10 | Opus arbitration ownership cannot be reduced without L3 Freeze Gate approval | CRITICAL | Authority drift detection + L3 gate |

### 10.1 Enforcement Implementation

每条规则必须在以下层面执行：

1. **TypeScript types** — Type system prevents structural violations
2. **Runtime assertions** — Guard functions validate invariants at critical points
3. **Test assertions** — Dedicated tests for each rule
4. **Git hooks** — Pre-commit checks for hardcoded keys, governance bypass patterns
5. **Audit logging** — All violations or attempted violations are logged immutably

## 11. DeepSeek Execution Boundary (E0–E3)

### 11.1 Principle

DeepSeek execution is bounded by **semantic risk**, not by file count.

If a change alters "how the system makes decisions in the future," even a one-line change escalates to E3. Conversely, a 100-file implementation-only change remains E0/E1.

### 11.2 Boundary Levels

| Level | Executor | Plan Required | External Review | Freeze Gate | Scope |
|-------|----------|---------------|-----------------|-------------|-------|
| **E0** | DeepSeek | No | No | No | tests, docs, type fixes, internal helpers, non-public implementation details |
| **E1** | DeepSeek | No | No | No | provider adapters, CLI options, memory helpers, schema-compatible fields, eval cases |
| **E2** | Opus | Yes | No | No | review-runner main flow, cost guard execution order, replay trigger strategy, ADR lifecycle, freeze snapshot conditions |
| **E3** | Opus | Yes | Yes (GPT-5.5) | Yes | Model Routing Protocol, Freeze Gate state machine, arbitration ownership, external reviewer authority, secret boundary, governance/runtime boundary, constitutional invariants, L2/L3 trigger matrix |

### 11.3 Boundary-Category Mapping

Each `TriggerCategory` maps to an execution boundary:

| Category | Boundary | Rationale |
|----------|----------|-----------|
| `test_changes` | E0 | No production impact |
| `implementation_only` | E0 | No architecture decision change |
| `docs_only` | E0 | Documentation only |
| `mock_provider` | E1 | No external impact |
| `non_breaking_cli_options` | E1 | No semantic change |
| `internal_refactor` | E1 | No external contract change |
| `provider_fallback_strategy` | E2 | Affects runtime behavior, needs plan |
| `cognitive_reviewer_contract` | E2 | Contract schema requires plan |
| `routing_decision_log_schema` | E2 | Audit schema requires plan |
| `architecture_diff_check_rules` | E2 | Diff rules affect governance |
| `new_model_role_introduction` | E2 | Model routing requires plan |
| `drift_detection_logic` | E2 | Drift logic affects governance |
| `model_routing_protocol` | E3 | Changes future decision-making |
| `freeze_gate_state_machine` | E3 | Changes constitutional freeze rules |
| `arbitration_ownership` | E3 | Changes who has final authority |
| `security_governance_invariant` | E3 | Changes security invariants |
| `governance_runtime_boundary` | E3 | Changes governance/runtime separation |
| `secret_boundary` | E3 | Secret management has security impact |

### 11.4 Model Selection by Boundary

```typescript
E0 → "deepseek"       // Free execution, no plan
E1 → "deepseek"       // Batch execution with tests
E2 → "claude-opus"    // Opus plan required before execution
E3 → "claude-opus"    // Opus arbitration + GPT-5.5 review + Freeze Gate
```

### 11.5 Enforcement Rules

**Rule B1 — File Count Does Not Matter:**
A change touching 100 files is still E0 if all categories are `implementation_only` or `test_changes`. File count is not a factor in boundary classification.

**Rule B2 — One Line Can Be E3:**
A one-line change to `arbitration_ownership`, `secret_boundary`, or `model_routing_protocol` is E3 regardless of diff size.

**Rule B3 — Highest Category Wins:**
When multiple categories are present, the highest (most restrictive) boundary applies. Mixing E1 and E3 categories results in E3.

**Rule B4 — No Unauthorized Escalation:**
An executor at E0/E1 cannot reclassify its own boundary. Any ambiguity must be escalated to Opus for classification.

### 11.6 Verification

```bash
# Verify no semantic-risk violations
grep -r "arbitration_ownership\|model_routing_protocol\|freeze_gate_state_machine\|secret_boundary" src/ --include="*.ts" | grep -v "governance/" | grep -v "\.test\." | head -5
# Expected: no output (these categories should only appear in governance code)

# Verify boundary tests pass
npx vitest run tests/governance/execution-boundary.test.ts
```

## 12. Testing Requirements

### 11.1 Required Test Cases

| # | Test | Coverage |
|---|------|----------|
| T1 | ADR creation with all required fields | Cognitive ADR creation path |
| T2 | ADR validation rejects incomplete ADR | Missing required fields |
| T3 | Rejected alternatives required for all ADRs | Empty rejectedAlternatives should fail validation |
| T4 | Reversal conditions required for constitutional ADRs | constitutionalImpact=BOUNDARY/INVARIANT/AUTHORITY must have reversalConditions |
| T5 | Default invariant registry returns 8 invariants | ALL default invariants present |
| T6 | External reviewer cannot finalize freeze | INV-002 enforcement via runtime check |
| T7 | Opus owns arbitration | INV-001 enforcement via runtime check |
| T8 | Governance layer cannot access secrets | INV-003 enforcement via architectural boundary |
| T9 | Runtime cannot mutate constitution | INV-004 enforcement via architectural boundary |
| T10 | Immutable freeze snapshots | Attempted mutation after FROZEN is rejected |
| T11 | Append-only governance history | Attempted deletion/overwrite is rejected |
| T12 | Drift replay detects invariant violation | replay + detectHistoricalInvariantViolation |
| T13 | Authority drift detection | detectAuthorityDrift on non-Opus arbiter |
| T14 | Routing drift detection | detectRoutingDrift on mini model reviewer |
| T15 | Governance/runtime leakage detection | detectGovernanceRuntimeLeakage on leaked entry |
| T16 | Governance graph linkage | getGovernanceGraph returns correct nodes + edges |
| T17 | Decision hash stability | Same input → same hash |

### 12.2 Test File

Tests must be placed at:

```
tests/governance/memory/governance-memory.test.ts
tests/governance/execution-boundary.test.ts
```

## 13. Post-Creation Verification

Execute after SKILL.md creation:

```bash
ls .claude/skills/governance-memory-skill
cat .claude/skills/governance-memory-skill/SKILL.md | head -40
```

After verification, proceed to P3.0 implementation:

1. Create TypeScript types (`governance-memory-types.ts`, `adr-types.ts`)
2. Create invariant registry (`invariant-registry.ts`)
3. Create ADR store (`adr-store.ts`, `adr-types.ts`)
4. Create governance memory store (`governance-memory.ts`)
5. Create drift replay (`drift-replay.ts`)
6. Create governance index (`governance-index.ts`)
7. Create utils (`governance-memory-utils.ts`)
8. Create documentation (`docs/governance/governance-memory.md`, ADR template, README)
9. Create tests (`tests/governance/memory/governance-memory.test.ts`)
10. Run `npm run typecheck && npm test` — verify full pass, no hardcoded keys, no forbidden language
