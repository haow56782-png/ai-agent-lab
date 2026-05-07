# Architecture Freeze Gate v0.1

## State Machine

```
DRAFT ──SUBMIT_FOR_REVIEW──▶ UNDER_REVIEW
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
                    ▼            ▼            │
           REQUEST_CHANGES   SEND_TO_        │
                    │       ARBITRATION      │
                    ▼            │            │
           CHANGES_REQUIRED     │            │
                    │            ▼            │
              RETURN_TO_DRAFT  ARBITRATION    │
                    │            │            │
                    └───┐   ┌────┼────┐       │
                        │   │    │    │       │
                        ▼   │    ▼    │       │
                       DRAFT │ APPROVE │       │
                             │    │    │       │
                             │    ▼    │       │
                             │  FROZEN │       │
                             │    │    │       │
                             │  THAW   │       │
                             │    │    │       │
                             ▼    ▼    ▼       ▼
                           return to DRAFT for re-freeze
```

### States

| State | Description | Can Implement? |
|-------|-------------|----------------|
| `DRAFT` | Architecture being drafted | No |
| `UNDER_REVIEW` | Architecture submitted for review | No |
| `CHANGES_REQUIRED` | Review found issues, revision needed | No |
| `ARBITRATION` | Opus arbitrating review findings | No |
| `FROZEN` | Architecture locked, implementation allowed | Yes |
| `THAWED` | Freeze released for changes | No |

### Allowed Transitions

| From | To | Transition |
|------|----|------------|
| DRAFT | UNDER_REVIEW | SUBMIT_FOR_REVIEW |
| UNDER_REVIEW | CHANGES_REQUIRED | REQUEST_CHANGES |
| UNDER_REVIEW | ARBITRATION | SEND_TO_ARBITRATION |
| CHANGES_REQUIRED | DRAFT | RETURN_TO_DRAFT |
| ARBITRATION | FROZEN | APPROVE |
| ARBITRATION | CHANGES_REQUIRED | REQUEST_CHANGES |
| FROZEN | THAWED | THAW |
| THAWED | DRAFT | RETURN_TO_DRAFT |

### Prohibited Transitions

| From | To | Reason |
|------|----|--------|
| DRAFT | FROZEN | Must pass review and arbitration |
| UNDER_REVIEW | FROZEN | Must go through arbitration first |
| FROZEN | DRAFT | Must thaw first |
| CHANGES_REQUIRED | FROZEN | Must return to draft and re-review |

## Freeze Gate Process Flow

```
1. Architect creates ADR (DRAFT)
2. ADR frozen → SUBMIT_FOR_REVIEW → UNDER_REVIEW
3. OpenAI Cognitive Review:
   - If issues found → REQUEST_CHANGES → CHANGES_REQUIRED → RETURN_TO_DRAFT → repeat from 2
   - If ready → SEND_TO_ARBITRATION → ARBITRATION
4. Claude Opus Arbitration:
   - If approved → APPROVE → FROZEN
   - If changes needed → REQUEST_CHANGES → CHANGES_REQUIRED → RETURN_TO_DRAFT → repeat from 2
5. Implementation proceeds (FROZEN)
6. If architecture change needed → THAW → THAWED → RETURN_TO_DRAFT → repeat from 2
```

## Thaw Protocol

### Thaw Requirements

Any change to a frozen architecture's interfaces, types, state machines, or invariants requires:

1. Create a thaw request documenting the reason, impact, affected interfaces, and invariants
2. Execute THAW transition → THAWED state
3. RETURN_TO_DRAFT → DRAFT state
4. Re-run full freeze gate cycle (OpenAI review → Opus arbitration → freeze)

### Thaw Request Fields

| Field | Description |
|-------|-------------|
| frozenArchitectureId | ID of the frozen ADR |
| requestedBy | claude-opus, deepseek-v4-pro, or human |
| reason | Why the thaw is needed |
| impactAnalysis | List of impact descriptions |
| affectedInterfaces | Interface names affected |
| affectedInvariants | Invariant names affected |
| requestedAt | ISO timestamp |

## Diff-Check Gate

The diff-check gate runs before any implementation change to a frozen architecture. It detects drift between the frozen architecture contract and the proposed implementation.

### Diff-Check Rules

| Condition | Status | Action |
|-----------|--------|--------|
| All frozen interfaces preserved | PASS | Proceed |
| Non-breaking additions only | WARN | Log, proceed with caution |
| Breaking changes or invariant violations | FAIL | Block, requiresThaw=true |

### Diff-Check Flow

```
Implementation Plan → Diff-Check Gate
    ├── PASS  → DeepSeek v4 Pro proceeds
    ├── WARN  → DeepSeek v4 Pro proceeds (logged)
    └── FAIL  → Thaw Protocol required → full freeze cycle
```

## Audit Logging

Every freeze gate transition and routing decision is recorded in the audit log:

| Field | Content |
|-------|---------|
| taskId | Unique task identifier |
| selectedModel | Model that handled the task |
| role | Role in the architecture process |
| reason | Why this model was selected |
| timestamp | When the decision was made |
| inputSummary | Summary of the input |
| outputSummary | Summary of the output |

## Implementation Rules

1. No implementation code may be written before the architecture reaches FROZEN state
2. OpenAI never writes implementation code — only critique, risks, and verdicts
3. Diff-check must pass before DeepSeek v4 Pro executes implementation
4. All routing decisions must be logged
5. Thaw requires full re-freeze cycle
