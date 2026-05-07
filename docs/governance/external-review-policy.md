# External Review Governance Policy

**Version:** 1.0.0
**Status:** DRAFT — Pending governance board ratification
**Last Updated:** 2026-05-07

---

## 1. Purpose

The External Review Governance Policy establishes formal criteria for when a code or architecture change requires external cognitive review (L2) or freeze gate escalation (L3). Its purpose is to **prevent architecture decision drift** across evolving cognitive systems by governing:

- **Decision Authority** — Who can make which architectural decisions without external oversight.
- **Protocol Stability** — Which changes to the model routing protocol, freeze gate, or arbitration chain require external validation.
- **Constitutional Boundaries** — Which security, governance, and invariance rules cannot be modified without full freeze gate review.

---

## 2. Review Levels

| Level | Label | Review Required | Freeze Gate | Examples |
|-------|-------|-----------------|-------------|----------|
| L0 | None | No | No | Test changes, refactors, docs |
| L1 | Advisory | Schema / lightweight review | No | CLI flags, mock providers |
| L2 | Mandatory | Full cognitive architecture review | No | Provider contracts, drift logic |
| L3 | Freeze Gate | Full review + freeze escalation | Yes | Protocol, arbitration, security |

### 2.1 L0 — No Review

Changes that do not affect architecture decisions, protocols, or governance logic.

**Criteria:** Implementation details only. No change to external contracts, routing logic, or governance rules.

**Approval:** Self-approved within standard workflow.

**Allowed triggers:** `test_changes`, `internal_refactor`, `implementation_only`, `docs_only`

### 2.2 L1 — Advisory Review

Changes that touch tooling or non-critical surface area but do not alter architecture decisions.

**Criteria:** Schema-only changes, mock providers, non-breaking CLI additions. No routing or governance logic changes.

**Reviewer:** gpt-5.4-mini (advisory, not binding)

**Allowed triggers:** `mock_provider`, `non_breaking_cli_options`

### 2.3 L2 — Mandatory External Review

Changes that affect governance contracts, provider behavior, or detection logic. Requires full cognitive architecture review.

**Criteria:** Changes to any governance contract, provider fallback strategy, architecture diff rules, secret boundaries, model roles, or drift detection.

**Reviewer:** gpt-5.5 (external cognitive reviewer)

**Gate:** Cannot merge without passing cognitive review. If review is REJECT, must return to architecture planning.

**Allowed triggers:** `provider_fallback_strategy`, `cognitive_reviewer_contract`, `routing_decision_log_schema`, `architecture_diff_check_rules`, `secret_boundary`, `new_model_role_introduction`, `drift_detection_logic`

### 2.4 L3 — Freeze Gate Escalation

Changes that modify decision authority, protocol stability, or constitutional boundaries. Requires full freeze gate protocol.

**Criteria:** Changes to model routing protocol, freeze gate state machine, arbitration ownership, security governance invariants, or the governance/runtime boundary.

**Reviewer:** gpt-5.5-pro (freeze level reviewer)

**Gate:** Must pass freeze gate: DRAFT → UNDER_REVIEW → ARBITRATION → FROZEN. No implementation may proceed until FROZEN status is achieved.

**Allowed triggers:** `model_routing_protocol`, `freeze_gate_state_machine`, `arbitration_ownership`, `security_governance_invariant`, `governance_runtime_boundary`

---

## 3. Trigger Matrix

### 3.1 Mandatory Triggers (12)

| # | Trigger Category | Level | Description |
|---|-----------------|-------|-------------|
| 1 | `model_routing_protocol` | L3 | Changes to how models are selected for tasks |
| 2 | `freeze_gate_state_machine` | L3 | Changes to the freeze gate state machine or valid transitions |
| 3 | `arbitration_ownership` | L3 | Changes to who holds arbitration authority |
| 4 | `security_governance_invariant` | L3 | Changes to security or governance invariant rules |
| 5 | `governance_runtime_boundary` | L3 | Changes to the boundary between governance and runtime layers |
| 6 | `provider_fallback_strategy` | L2 | Changes to provider fallback policy or behavior |
| 7 | `cognitive_reviewer_contract` | L2 | Changes to CognitiveReviewInputV2 or CognitiveReviewOutputV2 schema |
| 8 | `routing_decision_log_schema` | L2 | Changes to RoutingDecisionLog field structure |
| 9 | `architecture_diff_check_rules` | L2 | Changes to diff-check gate rules or severity classification |
| 10 | `secret_boundary` | L2 | Changes to how secrets or API keys are managed |
| 11 | `new_model_role_introduction` | L2 | Introduction of a new model-role pair in the routing chain |
| 12 | `drift_detection_logic` | L2 | Changes to architecture drift detection logic |

### 3.2 Optional Triggers (6)

| # | Trigger Category | Level | Description |
|---|-----------------|-------|-------------|
| 13 | `test_changes` | L0 | Test-only changes with no production impact |
| 14 | `internal_refactor` | L0 | Internal refactoring with no external contract change |
| 15 | `mock_provider` | L0 | Mock provider changes with no external impact |
| 16 | `non_breaking_cli_options` | L0 | CLI option additions that don't change semantics |
| 17 | `implementation_only` | L0 | Implementation details with no architecture decision change |
| 18 | `docs_only` | L0 | Documentation-only changes |

### 3.3 Resolution Rules

When multiple categories are affected, the **highest** level wins:

```
max(categories) → review level
```

If any single category is L3, the entire change requires freeze gate escalation regardless of other categories.

---

## 4. Escalation Policy

### 4.1 Escalation Flow

```
Change Submitted
    │
    ├── All categories L0/L1 → No external review → Standard workflow
    │
    ├── Any category L2 → Mandatory cognitive review
    │       │
    │       ├── REVIEW APPROVED → proceed to standard merge
    │       ├── REVIEW APPROVED_WITH_CHANGES → address findings → re-review
    │       └── REVIEW REJECTED → return to architecture planning
    │
    └── Any category L3 → Freeze gate escalation
            │
            ├── DRAFT → UNDER_REVIEW → ARBITRATION
            │       │
            │       ├── ARBITRATION APPROVED → FROZEN → implement
            │       ├── ARBITRATION APPROVED_WITH_CHANGES → modify → re-arbitrate
            │       └── ARBITRATION REJECTED → DRAFT → redesign
            │
            └── FROZEN architecture requires THAW protocol for modification
```

### 4.2 Priority Inversion Protection

If a change contains both L2 and L3 categories, L3 takes precedence. The freeze gate escalation subsumes the L2 review — the cognitive review happens as part of the freeze gate pipeline.

### 4.3 Emergency Override

In case of security vulnerability (CVE, active exploit), the L3 freeze gate may be bypassed by unanimous consent of:
1. Architecture Governor (claude-opus)
2. Security Governance Holder (designated human)
3. One additional peer reviewer

The override must be documented in a post-incident review within 72 hours.

---

## 5. Reviewer Model Policy

| Level | Model | Final Reviewer | Purpose |
|-------|-------|---------------|---------|
| L0 | none | N/A | No review required |
| L1 | gpt-5.4-mini | No (advisory only) | Schema / batch review |
| L2 | gpt-5.5 | No (advisory only) | Architecture governance review |
| L3 | gpt-5.5-pro | No (advisory only) | Freeze / final arbitration review |

**Key rule:** No external model is ever the final reviewer. All review output passes through Claude Opus arbitration before any freeze decision is final. External models provide advisory cognitive review; Claude Opus holds decision authority.

---

## 6. Architecture Drift Governance

### 6.1 Drift Types

| Drift Type | Definition | Detection |
|-----------|------------|-----------|
| **Model Drift** | A model other than the designated one is assigned a role | RoutingDecisionLog role-model mismatch |
| **Authority Drift** | A model without proper authority performs a governance action | Cognitive reviewer model check |
| **Protocol Drift** | A change bypasses the routing protocol without proper escalation | Missing freeze gate transition |
| **Schema Drift** | A governance contract changes without corresponding review | Trigger category mismatch for schema change |

### 6.2 Drift Detection Rules (implemented in `evaluateRoutingDrift`)

1. **MINI model cannot be the final cognitive reviewer** — If the selected model contains "mini" in its name and the role is COGNITIVE_REVIEWER, this is drift.
2. **Only designated reviewer models can perform cognitive review** — COGNITIVE_REVIEWER role must use `openai-reviewer` as the selected model.
3. **Architecture Governor must be claude-opus** — ARCHITECTURE_GOVERNOR role must use `claude-opus` as the selected model.

### 6.3 Remediation

When drift is detected:
1. The offending routing decision is logged with a warning
2. The change is blocked from proceeding through the pipeline
3. An escalation is raised to the governance layer
4. The architecture governor (claude-opus) reviews and determines corrective action

---

## 7. Compliance & Enforcement

### 7.1 Automated Enforcement

The external review policy is enforced at multiple points:

1. **Trigger evaluation** — Every change set is classified against the trigger matrix
2. **Pipeline injection** — review-runner.ts calls evaluateTrigger() to determine required level
3. **Drift checks** — Every routing decision is validated against evaluateRoutingDrift()
4. **Audit logging** — All policy decisions are recorded in the audit log

### 7.2 Policy Violations

| Violation | Severity | Consequence |
|-----------|----------|-------------|
| Skipped L2 review | HIGH | Change blocked, mandatory review required |
| Skipped L3 freeze gate | CRITICAL | Change reverted, post-mortem required |
| Undetected drift | HIGH | Audit remediation, process review |
| Reviewer model bypass | CRITICAL | Immediate freeze, security review |

### 7.3 Policy Amendment

This policy document itself is an L3-triggered artifact. Any amendment requires:
1. Freeze gate escalation (L3)
2. Full cognitive review
3. Governance board approval

---

## 8. Appendix: Integration Points

### 8.1 Pipeline Integration

The external review policy integrates with the existing governance pipeline at:

- **`evaluateTrigger(category)`** — Classify a single trigger into its review level
- **`getReviewLevel(categories)`** — Given a list of affected categories, return the highest required level
- **`shouldRequireExternalReview(level)`** — Check if a given level triggers external review
- **`shouldEscalateToFreezeGate(level)`** — Check if a given level triggers freeze gate
- **`evaluateRoutingDrift(entry)`** — Validate a routing log entry for drift

### 8.2 Audit Events

Every policy evaluation generates audit events:

| Event | Trigger | Data |
|-------|---------|------|
| Review Level Assigned | `evaluateTrigger()` | category, level, reason |
| External Review Required | `shouldRequireExternalReview()` | level, categories |
| Freeze Gate Escalation | `shouldEscalateToFreezeGate()` | level, categories |
| Drift Detected | `evaluateRoutingDrift()` | warnings, entry details |
