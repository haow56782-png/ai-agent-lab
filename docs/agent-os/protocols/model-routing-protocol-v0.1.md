# Model Routing Protocol v0.1

## Purpose

Define the execution model selection policy for all Agent OS tasks. Every task MUST be routed to the correct model tier based on complexity, risk, and task type. This protocol prevents architectural drift, controls cost, and ensures consistent output quality.

## Architecture Freeze Rule

**No implementation code may be written before architecture freeze.**

Architecture freeze requires all of the following:

| Condition | Evidence |
|-----------|----------|
| Module boundaries defined | File tree with responsibilities scoped |
| Types finalized | Core interfaces, enums, type exports declared |
| Interfaces approved | Public API surface with input/output contracts |
| Invariants documented | System constraints, forbidden states, edge case rules |
| Acceptance criteria locked | Test count, eval count, forbidden language, performance bounds |

Only after the freeze declaration may execution begin:
- **DeepSeek v4 Pro**: implementation, domain logic, medium-complexity code
- **DeepSeek v4 Flash**: batch execution, test scaffolding, mechanical edits, format normalization

## Model Tiers

### Tier 1 — claude-opus (Architecture & Governance)

| Attribute | Value |
|-----------|-------|
| Model | `claude-opus-4-7` |
| API | `POST https://api.anthropic.com/v1/messages` |
| Role | Architecture decision, system design, cross-module consistency, governance, correction |

**When to route to claude-opus:**

1. **New module architecture**: Defining module boundaries, types, interfaces, invariants
2. **Cross-module dependency design**: Memory → Knowledge Graph → Decision Engine interconnects
3. **System-wide protocol design**: Capability Protocol, Model Routing Protocol, Task Execution Gate
4. **Irreversible architectural decisions**: Storage backend choice, communication protocol, data model
5. **Correction of architectural drift**: When a lower-tier model produces output inconsistent with existing architecture
6. **Governance and arbitration**: Final review before freeze declaration, resolving design conflicts
7. **Memory / Knowledge Graph / Multi-Agent Debate / Learning Loop design**: Any task touching L7 memory architecture or cross-agent coordination

**Output format:**

```
## Architecture Decision Record
- Decision:
- Context:
- Alternatives considered:
- Selected approach:
- Rationale:
- Impact on other modules:
- Migration path (if applicable):
```

### Tier 2 — deepseek-v4-pro (Default Implementation)

| Attribute | Value |
|-----------|-------|
| Model | `deepseek-v4-pro` |
| Role | Domain logic, implementation planning, product logic, PRD/spec writing, medium-complexity code |

**When to route to deepseek-v4-pro:**

1. Implementation of frozen architecture within defined module boundaries
2. Domain logic and business rules
3. Medium-complexity code tasks (new functions, services, utilities)
4. Product requirements and specification documents
5. Test implementation within established patterns
6. Eval scenario logic

**Constraints:**

- MUST NOT define new module boundaries, types, or interfaces without architecture freeze
- MUST NOT deviate from the frozen architecture without escalation
- If architectural drift is detected during implementation → STOP → escalate to claude-opus

### Tier 3 — deepseek-v4-flash (Repetitive / Batch / Loop)

| Attribute | Value |
|-----------|-------|
| Model | `deepseek-v4-pro` (System prompt context: "deepseek-v4-flash") |
| Role | Repetitive execution, batch generation, mechanical edits, test scaffolding, format normalization |

**When to route to deepseek-v4-flash:**

1. Update many similar files (bulk rename, migration, normalization)
2. Fix repeated lint/type errors across a module
3. Generate repetitive eval scenarios following an established template
4. Convert documentation to standard structure
5. Run checklist-based validation
6. Summarize logs or metrics
7. Produce batch test cases from existing patterns
8. Schema-filling and frontmatter normalization

**Constraints:**

- MUST NOT make architectural decisions
- MUST NOT define new types or interfaces
- MUST follow existing patterns exactly
- If ambiguity is detected → STOP → escalate to deepseek-v4-pro

## Routing Decision Tree

```
Task arrives
  │
  ├─ Is this a new module, architecture change, or cross-module design?
  │   YES → claude-opus: produce Architecture Decision Record
  │          → freeze architecture
  │          → hand off to deepseek-v4-pro for implementation
  │
  ├─ Is this implementation within frozen boundaries?
  │   YES → deepseek-v4-pro: implement
  │          → if drift detected → STOP → escalate to claude-opus
  │
  ├─ Is this repetitive, batch, or mechanical?
  │   YES → deepseek-v4-flash: execute
  │          → if ambiguity → STOP → escalate to deepseek-v4-pro
  │
  └─ Default → deepseek-v4-pro
```

## Escalation Protocol

### Tier 2 → Tier 1 (Pro → Opus)

Escalate when any of the following occur during implementation:

| Signal | Action |
|--------|--------|
| Output drifts from frozen architecture | STOP. Archive the drifted output. Escalate to Opus with diff. |
| Requires defining new module boundary | STOP. Escalate for architecture decision. |
| Requires adding new types/interfaces not in freeze | STOP. Escalate for interface approval. |
| Discovering hidden cross-module dependency | STOP. Escalate for dependency analysis. |
| Implementation reveals ambiguity in freeze | STOP. Escalate for freeze clarification. |
| Touch memory, knowledge graph, or multi-agent debate | Escalate for governance review. |

Escalation output from Opus:
```
## Architecture Drift Correction
- Original architecture:
- Drifted implementation:
- Root cause:
- Correction:
- Freeze update (if needed):
```

### Tier 3 → Tier 2 (Flash → Pro)

Escalate when:

| Signal | Action |
|--------|--------|
| Template doesn't match the actual case | STOP. Escalate for pattern analysis. |
| Batch operation requires a judgement call | STOP. Escalate for decision. |
| Repetitive task reveals an inconsistency | Document inconsistency. Escalate. |

## Anti-Drift Checklist

Before every complex task execution, verify against:

- [ ] Existing architecture documents are loaded and reviewed
- [ ] Current roadmap and milestone state is known
- [ ] Previous completed milestones are referenced
- [ ] Test baseline is loaded (expected pass count)
- [ ] Eval scenario count is loaded (expected total)
- [ ] Forbidden language constraints are checked
- [ ] System invariants (typecheck, tests pass) are verified before and after

If any check fails → STOP → produce Architecture Alignment Report before proceeding.

## Cost Control

| Tier | Use case | Cost multiplier |
|------|----------|----------------|
| claude-opus | Architecture, governance, correction | 3x (use sparingly) |
| deepseek-v4-pro | Default implementation | 1x (baseline) |
| deepseek-v4-flash | Batch, repetitive, mechanical | 0.25x (preferred for volume) |

### Optimization rules

1. Opus produces architecture → Pro implements → Flash batches = optimal cost structure
2. If Opus is used for implementation (not architecture), the routing is wrong
3. If Flash is used for architecture decisions, the routing is wrong
4. Architecture freeze is a cost-control mechanism: prevent wasted implementation on wrong design

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| v0.1 | 2026-05-07 | VIB Agent OS | Initial model routing protocol with 3 tiers, freeze rule, escalation protocol |
